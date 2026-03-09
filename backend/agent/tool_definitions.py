"""OpenAI-compatible tool schemas for the Groq function-calling API."""

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory",
            "description": "Get the complete list of all products in the user's inventory with name, category, quantity, price, and restock threshold. Use when the user asks about their products, stock levels, or inventory.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_items",
            "description": "Get products that are running low (quantity at or below their restock threshold). Use when the user asks about low stock, items to reorder, or what's running out.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_analytics",
            "description": "Get sales analytics: total revenue, total orders, top-selling products, and category breakdown. Use when the user asks about sales performance, revenue, or business metrics.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_transactions",
            "description": "Get the most recent sales transactions. Use when the user asks about recent sales, what sold today/this week, or transaction history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent transactions to fetch (default 10, max 50).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_demand_forecast",
            "description": "Get AI-powered demand predictions for the next 7 days: trending products, market opportunities, and weekly tips. Use when the user asks about future demand, what will sell, or market trends.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_restock_recommendations",
            "description": "Get smart restock recommendations: which products to reorder, how many units, and urgency level. Use when the user asks what to restock, how much to order, or for purchasing advice.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_business_report",
            "description": "Generate a comprehensive business health report with health score, highlights, concerns, and action items. Use when the user asks for a business summary, health check, or overall performance review.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "record_sale",
            "description": "Record a product sale. Decrements inventory and creates a transaction record. IMPORTANT: Only call this after the user clearly states what product and quantity they want to sell.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Exact name of the product to sell.",
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of units to sell.",
                    },
                },
                "required": ["product_name", "quantity"],
            },
        },
    },
]
