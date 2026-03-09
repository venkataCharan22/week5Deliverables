"""Core agent loop: Groq tool-calling with SSE streaming."""

import json
from typing import AsyncGenerator
from services.groq_service import get_groq_client
from agent.tool_definitions import AGENT_TOOLS
from services import tools as tool_functions

TOOL_REGISTRY = {
    "get_inventory": tool_functions.get_inventory,
    "get_low_stock_items": tool_functions.get_low_stock_items,
    "get_sales_analytics": tool_functions.get_sales_analytics,
    "get_recent_transactions": tool_functions.get_recent_transactions,
    "get_demand_forecast": tool_functions.get_demand_forecast,
    "get_restock_recommendations": tool_functions.get_restock_recommendations,
    "get_business_report": tool_functions.get_business_report,
    "record_sale": tool_functions.record_sale,
}

TOOL_STATUS_LABELS = {
    "get_inventory": "Looking up your inventory...",
    "get_low_stock_items": "Checking for low stock items...",
    "get_sales_analytics": "Analyzing your sales data...",
    "get_recent_transactions": "Fetching recent transactions...",
    "get_demand_forecast": "Generating demand forecast...",
    "get_restock_recommendations": "Computing restock recommendations...",
    "get_business_report": "Generating business health report...",
    "record_sale": "Recording the sale...",
}

AGENT_SYSTEM_PROMPT = """You are BizBuddy AI, a smart business assistant for small Indian shopkeepers.
You have access to tools that can look up real inventory data, sales analytics, demand forecasts, and more.

Rules:
1. Use tools to get REAL data before answering questions about the user's business. Do NOT guess or make up inventory data.
2. You can chain multiple tools if needed (e.g. check inventory AND sales to give comprehensive advice).
3. Keep responses concise (3-6 sentences), practical, and friendly. Use bullet points for lists.
4. Use INR (Rs. or ₹) for currency.
5. When the user asks you to record a sale, confirm the product name and quantity before calling record_sale.
6. If a tool returns an error, explain the issue clearly to the user.
7. For general business advice that doesn't need data, respond directly without tools.
8. When presenting data, summarize the key insights rather than dumping raw numbers."""

MAX_ITERATIONS = 5


async def run_agent(
    user_id: str,
    messages: list[dict],
    business_type: str | None = None,
) -> AsyncGenerator[dict, None]:
    """Run the agentic loop. Yields SSE event dicts:
      {"event": "status",      "data": {"tool": "...", "label": "..."}}
      {"event": "tool_result", "data": {"tool": "...", "summary": "..."}}
      {"event": "message",     "data": {"content": "..."}}
      {"event": "error",       "data": {"message": "..."}}
      {"event": "done",        "data": {}}
    """
    client = get_groq_client()

    system_content = AGENT_SYSTEM_PROMPT
    if business_type:
        system_content += f"\nThe user runs a {business_type} shop in India. Tailor your advice accordingly."

    groq_messages = [{"role": "system", "content": system_content}]
    for msg in messages:
        groq_messages.append({"role": msg["role"], "content": msg["content"]})

    for _ in range(MAX_ITERATIONS):
        # Call Groq with tools
        try:
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=groq_messages,
                tools=AGENT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1024,
            )
        except Exception as e:
            yield {"event": "error", "data": {"message": f"AI service error: {str(e)[:120]}"}}
            yield {"event": "done", "data": {}}
            return

        choice = completion.choices[0]
        response_message = choice.message

        # If the model wants to call tools
        if response_message.tool_calls:
            # Append assistant message with tool_calls to conversation
            groq_messages.append({
                "role": "assistant",
                "content": response_message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in response_message.tool_calls
                ],
            })

            # Execute each tool call
            for tool_call in response_message.tool_calls:
                tool_name = tool_call.function.name
                tool_id = tool_call.id

                # Stream status to frontend
                yield {
                    "event": "status",
                    "data": {
                        "tool": tool_name,
                        "label": TOOL_STATUS_LABELS.get(tool_name, f"Running {tool_name}..."),
                    },
                }

                # Parse args
                try:
                    tool_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                except json.JSONDecodeError:
                    tool_args = {}

                # Execute
                tool_fn = TOOL_REGISTRY.get(tool_name)
                if tool_fn is None:
                    tool_result = {"error": f"Unknown tool: {tool_name}"}
                else:
                    try:
                        if tool_name == "record_sale":
                            tool_result = await tool_fn(
                                user_id=user_id,
                                product_name=tool_args.get("product_name", ""),
                                quantity=tool_args.get("quantity", 1),
                            )
                        elif tool_name == "get_recent_transactions":
                            tool_result = await tool_fn(
                                user_id=user_id,
                                limit=min(tool_args.get("limit", 10), 50),
                            )
                        elif tool_name == "get_demand_forecast":
                            tool_result = await tool_fn(
                                user_id=user_id,
                                business_type=business_type,
                            )
                        else:
                            tool_result = await tool_fn(user_id=user_id)
                    except Exception as e:
                        tool_result = {"error": f"Tool failed: {str(e)[:120]}"}

                # Stream tool result summary
                yield {
                    "event": "tool_result",
                    "data": {
                        "tool": tool_name,
                        "summary": _summarize_tool_result(tool_name, tool_result),
                    },
                }

                # Append tool result to conversation
                groq_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_id,
                    "content": json.dumps(tool_result, default=str),
                })

            # Loop back for Groq to see tool results
            continue

        # No tool calls → final text response
        final_content = response_message.content or "I couldn't generate a response. Please try again."
        yield {"event": "message", "data": {"content": final_content}}
        yield {"event": "done", "data": {}}
        return

    # Max iterations reached
    yield {
        "event": "message",
        "data": {"content": "I've gathered a lot of data. Let me know if you need more specific details."},
    }
    yield {"event": "done", "data": {}}


def _summarize_tool_result(tool_name: str, result: dict) -> str:
    if "error" in result:
        return f"Error: {result['error']}"
    summaries = {
        "get_inventory": lambda r: f"Found {r.get('total_count', 0)} products",
        "get_low_stock_items": lambda r: f"{r.get('count', 0)} items are low in stock",
        "get_sales_analytics": lambda r: f"Revenue: Rs.{r.get('total_revenue', 0):,.0f}, {r.get('total_orders', 0)} orders",
        "get_recent_transactions": lambda r: f"Fetched {r.get('count', 0)} recent transactions",
        "get_demand_forecast": lambda r: f"Forecast ready with {len(r.get('trending_up', []))} trending items",
        "get_restock_recommendations": lambda r: f"{len(r.get('recommendations', []))} restock suggestions",
        "get_business_report": lambda r: f"Health score: {r.get('score', 'N/A')}/100",
        "record_sale": lambda r: (
            f"Sale recorded: {r.get('quantity_sold', 0)}x {r.get('product', '')} = Rs.{r.get('total_amount', 0):,.0f}"
            if r.get("success")
            else r.get("error", "Failed")
        ),
    }
    fn = summaries.get(tool_name)
    return fn(result) if fn else "Done"
