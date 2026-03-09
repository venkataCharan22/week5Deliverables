import { useState, useRef } from 'react';
import { Search, Plus, ScanLine, X, Mic, Trash2, Camera, Upload, Check, Sparkles, Download, Clock, RotateCcw } from 'lucide-react';
import SwipeableProductCard from '../components/SwipeableProductCard';
import SellModal from '../components/SellModal';
import RentModal from '../components/RentModal';
import RentalCountdown from '../components/RentalCountdown';
import ImageUpload from '../components/ImageUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProducts } from '../hooks/useProducts';
import { useProfile } from '../hooks/useProfile';
import { useRentals } from '../hooks/useRentals';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { BUSINESS_TYPES, DEFAULT_CATEGORIES } from '../lib/businessTypes';
import api from '../lib/api';

const emptyForm = { name: '', category: '', quantity: '', price: '', threshold: '5', image: '' };

export default function InventoryPage() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const { profile } = useProfile();
  const { rentals, loading: rentalsLoading, error: rentalsError } = useRentals();
  const [tab, setTab] = useState('products'); // 'products' | 'rentals'
  const [returning, setReturning] = useState({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [imageRecognizing, setImageRecognizing] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);

  // Sell & Rent state
  const [sellProduct, setSellProduct] = useState(null);
  const [rentProduct, setRentProduct] = useState(null);

  // OCR state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [addingItems, setAddingItems] = useState({});
  const fileInputRef = useRef(null);

  // Dynamic categories from business type
  const businessDef = BUSINESS_TYPES.find((b) => b.id === profile?.businessType);
  const categories = ['All', ...(businessDef?.defaultCategories || DEFAULT_CATEGORIES)];

  // Fetch product image from Pexels via AI
  const fetchProductImage = async (productName) => {
    if (!productName || productName.length < 2) return;
    setFetchingImage(true);
    try {
      const { data } = await api.post('/product-image', {
        product_name: productName,
        business_type: profile?.businessType || null,
      });
      if (data.image_url) {
        setForm((f) => ({ ...f, image: f.image || data.image_url }));
      }
    } catch {
      // Silently fail — image is optional
    } finally {
      setFetchingImage(false);
    }
  };

  // Enhanced voice: parse transcript with AI
  const handleVoiceResult = async (transcript) => {
    setForm((f) => ({ ...f, name: transcript }));
    setVoiceParsing(true);
    try {
      const { data } = await api.post('/voice-parse', {
        transcript,
        business_type: profile?.businessType || null,
      });
      const parsedName = data.name || transcript;
      setForm({
        name: parsedName,
        category: data.category || '',
        quantity: String(data.quantity || ''),
        price: String(data.price || ''),
        threshold: '5',
        image: '',
      });
      // Auto-fetch product image after voice parse
      fetchProductImage(parsedName);
    } catch {
      // Fallback: keep just the name, still try fetching image
      fetchProductImage(transcript);
    } finally {
      setVoiceParsing(false);
    }
  };

  const { isListening, startListening, stopListening } = useVoiceInput(handleVoiceResult);

  // Image recognition: upload → OCR + AI → auto-fill fields
  const handleImageChange = async (val) => {
    setForm((f) => ({ ...f, image: val }));
    if (!val || !val.startsWith('data:')) return;
    setImageRecognizing(true);
    try {
      const { data } = await api.post('/image-recognize', {
        image_base64: val,
        business_type: profile?.businessType || null,
      });
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        category: data.category || f.category,
        price: data.price ? String(data.price) : f.price,
      }));
    } catch (err) {
      console.error('Image recognition failed:', err);
    } finally {
      setImageRecognizing(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category || '',
      quantity: String(product.quantity),
      price: String(product.price),
      threshold: String(product.threshold),
      image: product.image || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      quantity: parseInt(form.quantity) || 0,
      price: parseFloat(form.price) || 0,
      threshold: parseInt(form.threshold) || 5,
      image: form.image || null,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct(payload);
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditingProduct(null);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Auto-categorize when product name loses focus
  const [autoCategorizing, setAutoCategorizing] = useState(false);
  const lastCategorizedName = useRef('');
  const handleNameBlur = async () => {
    const name = form.name.trim();
    if (!name || name.length < 2 || name === lastCategorizedName.current) return;
    lastCategorizedName.current = name;

    // Auto-fetch product image if none set
    if (!form.image) {
      fetchProductImage(name);
    }

    // Only auto-fill category/price if still empty
    if (form.category && form.price) return;
    setAutoCategorizing(true);
    try {
      const { data } = await api.post('/auto-categorize', {
        product_name: name,
        business_type: profile?.businessType || null,
      });
      setForm((f) => ({
        ...f,
        category: f.category || data.category || '',
        price: f.price || (data.suggested_price ? String(data.suggested_price) : ''),
        threshold: f.threshold === '5' && data.suggested_threshold ? String(data.suggested_threshold) : f.threshold,
      }));
    } catch {
      // Silently fail
    } finally {
      setAutoCategorizing(false);
    }
  };

  // --- Export ---
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizbuddy_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // --- Return rental ---
  const handleReturnRental = async (rentalId) => {
    setReturning((prev) => ({ ...prev, [rentalId]: true }));
    try {
      await api.post('/return-rental', { rental_id: rentalId });
    } catch (err) {
      console.error('Return failed:', err);
    } finally {
      setReturning((prev) => ({ ...prev, [rentalId]: false }));
    }
  };

  // --- OCR Scan Logic ---
  const handleScanFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanResults(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setScanResults(data);
    } catch (err) {
      console.error('OCR failed:', err);
      setScanResults({ raw_text: 'OCR failed. Make sure the backend is running.', extracted_items: [] });
    } finally {
      setScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddScannedItem = async (item, index) => {
    setAddingItems((prev) => ({ ...prev, [index]: 'adding' }));
    try {
      await addProduct({ name: item.name, category: null, quantity: item.quantity || 1, price: item.price || 0, threshold: 5 });
      setAddingItems((prev) => ({ ...prev, [index]: 'added' }));
    } catch {
      setAddingItems((prev) => ({ ...prev, [index]: 'error' }));
    }
  };

  const handleAddAllScanned = async () => {
    if (!scanResults?.extracted_items?.length) return;
    for (let i = 0; i < scanResults.extracted_items.length; i++) {
      if (addingItems[i] !== 'added') await handleAddScannedItem(scanResults.extracted_items[i], i);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h1 className="text-xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 rounded-xl bg-gray-800 px-2.5 py-2 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
          >
            <Download size={13} />
            {exporting ? '...' : 'Export'}
          </button>
          <button
            onClick={() => { setShowScanModal(true); setScanResults(null); setAddingItems({}); }}
            className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs"
          >
            <ScanLine size={14} />
            Scan
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Tab Toggle: Products | Rentals */}
      <div className="mt-4 flex gap-1 mx-4 rounded-xl bg-gray-900 p-1">
        <button
          onClick={() => setTab('products')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            tab === 'products' ? 'bg-gray-800 text-emerald-400' : 'text-gray-500'
          }`}
        >
          Products
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'products' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-800 text-gray-600'}`}>
            {products.length}
          </span>
        </button>
        <button
          onClick={() => setTab('rentals')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            tab === 'rentals' ? 'bg-gray-800 text-blue-400' : 'text-gray-500'
          }`}
        >
          <Clock size={13} />
          Rentals
          {rentals.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === 'rentals' ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>
              {rentals.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Products Tab ─── */}
      {tab === 'products' && (
        <>
          {/* Search */}
          <div className="mt-4 px-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
            </div>
          </div>

          {/* Category Chips */}
          <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-emerald-500 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Swipe hint */}
          <div className="mt-3 px-4">
            <p className="text-[10px] text-gray-600 text-center">Swipe left on a product to sell or rent</p>
          </div>

          {/* Product List */}
          <div className="mt-2 space-y-2 px-4">
            <p className="text-xs text-gray-500">{filtered.length} products</p>
            {filtered.map((product) => (
              <SwipeableProductCard
                key={product.id}
                product={product}
                onEdit={openEdit}
                onSell={(p) => setSellProduct(p)}
                onRent={(p) => setRentProduct(p)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-600">
                {products.length === 0 ? 'No products yet. Tap "Add" to get started!' : 'No products match your search'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Rentals Tab ─── */}
      {tab === 'rentals' && (
        <div className="mt-4 px-4 space-y-3">
          {rentalsLoading ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : rentalsError ? (
            <div className="py-16 text-center">
              <p className="text-sm text-red-400">Failed to load rentals</p>
              <p className="mt-1 text-xs text-gray-600">{rentalsError}</p>
            </div>
          ) : rentals.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={36} className="mx-auto text-gray-700" />
              <p className="mt-3 text-sm text-gray-500">No active rentals</p>
              <p className="mt-1 text-xs text-gray-600">Swipe left on a product and tap "Rent" to get started</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">{rentals.length} active rental{rentals.length !== 1 ? 's' : ''}</p>
              {rentals.map((r) => {
                const returnDt = r.returnDate instanceof Date ? r.returnDate : new Date(r.returnDate);
                const isOverdue = returnDt.getTime() < Date.now();
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      isOverdue
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    {/* Product + Overdue badge */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-white">{r.productName || 'Unknown Product'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {r.quantity || 1}x &middot; {r.category || 'Uncategorized'} &middot; ₹{r.pricePerUnit || 0}/unit
                        </p>
                      </div>
                      {isOverdue && (
                        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    {/* Customer */}
                    {r.customerName && (
                      <p className="text-xs text-gray-400">
                        Customer: <span className="text-gray-300 font-medium">{r.customerName}</span>
                      </p>
                    )}

                    {/* Live Countdown */}
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-gray-600">
                        Due: {returnDt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <RentalCountdown returnDate={returnDt} />
                    </div>

                    {/* Return button */}
                    <button
                      onClick={() => handleReturnRental(r.id)}
                      disabled={returning[r.id]}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 active:scale-[0.98]"
                    >
                      {returning[r.id] ? <LoadingSpinner size="sm" /> : (
                        <>
                          <RotateCcw size={13} />
                          Mark as Returned
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="flex w-full max-w-lg flex-col rounded-t-3xl border-t border-gray-800 bg-gray-950" style={{ maxHeight: '85dvh' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-4 scrollbar-none">
                {/* Product Image */}
                <div>
                  <label className="mb-2 block text-xs text-gray-500">Product Image</label>
                  <ImageUpload value={form.image} onChange={handleImageChange} />
                  {imageRecognizing && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                      <Sparkles size={12} className="animate-pulse" />
                      Recognizing product with AI...
                    </div>
                  )}
                  {fetchingImage && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400">
                      <Sparkles size={12} className="animate-pulse" />
                      Finding product image...
                    </div>
                  )}
                </div>

                {/* Name with Voice Input */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Product Name</label>
                  <div className="relative">
                    <input className="input pr-12" placeholder={businessDef?.placeholder || 'e.g. Product Name'} value={form.name} onChange={setField('name')} onBlur={handleNameBlur} required />
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-colors ${
                        isListening ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-emerald-400'
                      }`}
                    >
                      <Mic size={16} />
                      {isListening && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-red-500" />}
                    </button>
                  </div>
                  {isListening && (
                    <>
                      <p className="mt-1 animate-pulse text-xs text-red-400">Listening...</p>
                      <div className="mt-2 rounded-xl bg-gray-900 border border-gray-800 p-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Try saying</p>
                        {(businessDef?.voiceExamples || [
                          '"10 bags of Basmati Rice at 120 rupees each"',
                          '"Samsung Galaxy Buds, electronics, 3 pieces, 4500 rupees"',
                          '"5 kg cement at 350 total"',
                        ]).map((ex, i) => (
                          <p key={i} className={`text-xs ${i === 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{ex}</p>
                        ))}
                      </div>
                    </>
                  )}
                  {!isListening && !voiceParsing && !form.name && (
                    <div className="mt-2 rounded-xl bg-gray-900/50 border border-dashed border-gray-800 p-2.5">
                      <p className="text-[10px] text-gray-600 text-center">
                        Tap <span className="text-gray-500">🎤</span> and say something like: <span className="text-gray-400">{businessDef?.voiceHint || '"20 items at 40 rupees, category"'}</span>
                      </p>
                    </div>
                  )}
                  {voiceParsing && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
                      <Sparkles size={12} className="animate-pulse" />
                      Parsing with AI...
                    </div>
                  )}
                  {autoCategorizing && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-purple-400">
                      <Sparkles size={12} className="animate-pulse" />
                      Auto-categorizing with AI...
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Category</label>
                    <input className="input" placeholder={businessDef?.categoryHint || 'e.g. Category'} value={form.category} onChange={setField('category')} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Price (₹)</label>
                    <input className="input" type="number" step="0.01" placeholder="0" value={form.price} onChange={setField('price')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Quantity</label>
                    <input className="input" type="number" placeholder="0" value={form.quantity} onChange={setField('quantity')} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Low Stock Threshold</label>
                    <input className="input" type="number" placeholder="5" value={form.threshold} onChange={setField('threshold')} />
                  </div>
                </div>
              </div>

              {/* Sticky Footer Buttons */}
              <div className="shrink-0 border-t border-gray-800 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
                <button type="submit" disabled={saving || imageRecognizing} className="btn-primary flex w-full items-center justify-center py-3.5 text-sm font-semibold">
                  {saving ? <LoadingSpinner size="sm" /> : editingProduct ? 'Update Product' : 'Add Product'}
                </button>

                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => { handleDelete(editingProduct); setShowModal(false); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 size={14} /> Delete Product
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {sellProduct && (
        <SellModal
          product={sellProduct}
          onClose={() => setSellProduct(null)}
          onConfirm={async ({ productId, quantity, customerName }) => {
            await api.post('/sell', { product_id: productId, quantity, customer_name: customerName });
          }}
        />
      )}

      {/* Rent Modal */}
      {rentProduct && (
        <RentModal
          product={rentProduct}
          onClose={() => setRentProduct(null)}
          onConfirm={async ({ productId, quantity, customerName, returnDate }) => {
            await api.post('/rent', { product_id: productId, quantity, customer_name: customerName, return_date: returnDate });
          }}
        />
      )}

      {/* Scan Bill Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-gray-800 bg-gray-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Scan Bill / Invoice</h2>
              <button onClick={() => setShowScanModal(false)}><X size={20} className="text-gray-500" /></button>
            </div>

            {!scanResults && !scanning && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Take a photo or upload an image of a bill/invoice to auto-extract products.</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-gray-700 p-6 transition-colors hover:border-emerald-500/40">
                    <Camera size={24} className="text-emerald-400" />
                    <span className="text-xs font-medium text-gray-400">Take Photo</span>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFile} />
                  </label>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-gray-700 p-6 transition-colors hover:border-emerald-500/40">
                    <Upload size={24} className="text-emerald-400" />
                    <span className="text-xs font-medium text-gray-400">Upload Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleScanFile} />
                  </label>
                </div>
              </div>
            )}

            {scanning && (
              <div className="flex flex-col items-center gap-3 py-10">
                <LoadingSpinner size="lg" />
                <p className="text-sm text-gray-400">Scanning and extracting items...</p>
              </div>
            )}

            {scanResults && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-xs font-semibold text-gray-500">Extracted Text</h3>
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-gray-900 p-3 text-xs leading-relaxed text-gray-400">
                    {scanResults.raw_text || 'No text detected.'}
                  </div>
                </div>

                {scanResults.extracted_items?.length > 0 ? (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-gray-500">Found {scanResults.extracted_items.length} items</h3>
                      <button onClick={handleAddAllScanned} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25">
                        <Plus size={12} /> Add All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {scanResults.extracted_items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-900 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity || 1} &middot; ₹{item.price || 0}</p>
                          </div>
                          <button
                            onClick={() => handleAddScannedItem(item, i)}
                            disabled={addingItems[i] === 'added' || addingItems[i] === 'adding'}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              addingItems[i] === 'added' ? 'bg-emerald-500/15 text-emerald-400'
                                : addingItems[i] === 'adding' ? 'bg-gray-800 text-gray-500'
                                  : 'bg-gray-800 text-gray-300 hover:bg-emerald-500/15 hover:text-emerald-400'
                            }`}
                          >
                            {addingItems[i] === 'added' ? <span className="flex items-center gap-1"><Check size={12} /> Added</span>
                              : addingItems[i] === 'adding' ? <LoadingSpinner size="sm" /> : '+ Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-500">No items could be parsed. Try a clearer image.</p>
                )}

                <button
                  onClick={() => { setScanResults(null); setAddingItems({}); }}
                  className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <ScanLine size={14} /> Scan Another
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
