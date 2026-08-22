'use client'

import { useEffect, useState } from 'react'
import { 
  Gift, 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  Check, 
  X, 
  Loader2, 
  Percent, 
  DollarSign, 
  Sliders, 
  Info,
  Archive,
  FolderOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ProductItem {
  type: 'agent' | 'phone_number'
  agent_type?: 'sales' | 'support' | 'appointment' | 'lead_qualifier' | 'multi_agent'
  quantity: number
  individual_price: number // in paisa
  bundle_price: number // in paisa
}

interface Bundle {
  id: string
  name: string
  description: string
  products: {
    items: ProductItem[]
  } | ProductItem[] // Support both for backward compatibility
  individual_price_paisa: number
  bundle_price_paisa: number
  discount_percent: number
  is_active: boolean
  purchase_count: number
  created_at: string
}

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [products, setProducts] = useState<ProductItem[]>([
    { type: 'agent', agent_type: 'sales', quantity: 1, individual_price: 499900, bundle_price: 424900 }
  ])

  useEffect(() => {
    async function loadBundles() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/bundles')
        if (res.status === 403) {
          toast.error('Super Admin access required for bundles management')
          return
        }
        if (!res.ok) throw new Error('Failed to load bundles')
        const data = await res.json()
        setBundles(data.bundles || [])
      } catch (err: any) {
        toast.error(err.message || 'Error loading bundles')
      } finally {
        setLoading(false)
      }
    }
    loadBundles()
  }, [])

  const handleAddProduct = (type: 'agent' | 'phone_number', agentType?: any) => {
    if (type === 'phone_number') {
      setProducts([...products, { 
        type: 'phone_number', 
        quantity: 1, 
        individual_price: 29900, 
        bundle_price: 24900 
      }])
    } else {
      setProducts([...products, { 
        type: 'agent', 
        agent_type: agentType || 'sales', 
        quantity: 1, 
        individual_price: 499900, 
        bundle_price: 424900 
      }])
    }
  }

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, idx) => idx !== index))
  }

  const handleProductChange = (index: number, key: keyof ProductItem, value: any) => {
    const updated = [...products]
    updated[index] = { ...updated[index], [key]: value }
    setProducts(updated)
  }

  const calculateDiscount = (ind: number, bnd: number) => {
    if (ind <= 0) return 0
    const diff = ind - bnd
    return Math.max(0, Math.round((diff / ind) * 100))
  }

  // Derived values for the items list
  const totalIndividualPaisa = products.reduce((acc, p) => acc + (p.individual_price || 0) * (p.quantity || 0), 0)
  const totalBundlePaisa = products.reduce((acc, p) => acc + (p.bundle_price || 0) * (p.quantity || 0), 0)
  const totalSavingsPaisa = Math.max(0, totalIndividualPaisa - totalBundlePaisa)
  const savingsPct = totalIndividualPaisa > 0 ? Math.round((totalSavingsPaisa / totalIndividualPaisa) * 100) : 0

  const handleSaveBundle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || products.length === 0) {
      toast.error('Please prefill name and add at least one product.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name,
        description,
        products: { items: products },
        individual_price_paisa: totalIndividualPaisa,
        bundle_price_paisa: totalBundlePaisa,
        discount_percent: savingsPct,
        is_active: isActive
      }

      const res = await fetch('/api/admin/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create bundle')
      }

      const data = await res.json()
      setBundles([data.bundle, ...bundles])
      toast.success('Bundle created successfully!')
      
      // Reset Form
      setName('')
      setDescription('')
      setProducts([{ type: 'agent', agent_type: 'sales', quantity: 1, individual_price: 499900, bundle_price: 424900 }])
      setIsActive(true)
      setShowAddForm(false)
    } catch (err: any) {
      toast.error(err.message || 'Error saving bundle')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (bundle: Bundle) => {
    try {
      const res = await fetch('/api/admin/bundles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bundle.id,
          is_active: !bundle.is_active
        })
      })

      if (!res.ok) throw new Error('Failed to update bundle status')
      
      setBundles(bundles.map(b => b.id === bundle.id ? { ...b, is_active: !b.is_active } : b))
      toast.success(`Bundle ${!bundle.is_active ? 'activated' : 'deactivated'} successfully!`)
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    }
  }

  const handleEditClick = (bundle: Bundle) => {
    setEditingBundle(bundle)
    setName(bundle.name)
    setDescription(bundle.description || '')
    
    // Safely load items from new/old schema format
    const productsObj = bundle.products as any
    const list = Array.isArray(productsObj)
      ? productsObj.map((p: any) => ({
          type: p.type,
          agent_type: p.agent_type || 'sales',
          quantity: p.quantity,
          individual_price: p.individual_price || (p.type === 'agent' ? 499900 : 29900),
          bundle_price: p.bundle_price || (p.type === 'agent' ? 424900 : 24900)
        }))
      : (productsObj?.items || []).map((p: any) => ({
          type: p.type,
          agent_type: p.agent_type || 'sales',
          quantity: p.quantity,
          individual_price: p.individual_price || (p.type === 'agent' ? 499900 : 29900),
          bundle_price: p.bundle_price || (p.type === 'agent' ? 424900 : 24900)
        }))

    setProducts(list)
    setIsActive(bundle.is_active)
    setShowAddForm(true)
  }

  const handleUpdateBundle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBundle) return

    setSaving(true)
    try {
      const payload = {
        id: editingBundle.id,
        name,
        description,
        products: { items: products },
        individual_price_paisa: totalIndividualPaisa,
        bundle_price_paisa: totalBundlePaisa,
        discount_percent: savingsPct,
        is_active: isActive
      }

      const res = await fetch('/api/admin/bundles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to update bundle')
      }

      const data = await res.json()
      setBundles(bundles.map(b => b.id === editingBundle.id ? data.bundle : b))
      toast.success('Bundle updated successfully!')
      
      // Reset Form
      setName('')
      setDescription('')
      setProducts([{ type: 'agent', agent_type: 'sales', quantity: 1, individual_price: 499900, bundle_price: 424900 }])
      setIsActive(true)
      setEditingBundle(null)
      setShowAddForm(false)
    } catch (err: any) {
      toast.error(err.message || 'Error updating bundle')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] font-display flex items-center gap-2">
            <Gift className="w-6 h-6 text-violet-500" />
            Product Bundles Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            Create bundles combining voice agents and phone numbers with customized discounts.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBundle(null)
            setName('')
            setDescription('')
            setProducts([{ type: 'agent', agent_type: 'sales', quantity: 1, individual_price: 499900, bundle_price: 424900 }])
            setIsActive(true)
            setShowAddForm(!showAddForm)
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-550 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-sm"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showAddForm ? 'Cancel' : 'Create Bundle'}</span>
        </button>
      </div>

      {/* Add / Edit Form Drawer */}
      {showAddForm && (
        <form onSubmit={editingBundle ? handleUpdateBundle : handleSaveBundle} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold font-display text-[var(--heading)] uppercase tracking-wider">
            {editingBundle ? `✏️ Edit Bundle: ${editingBundle.name}` : '🎁 Create Product Bundle'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider mb-2">Bundle Name *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Starter Dual Agent Bundle"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider mb-2">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize bundle contents and savings..."
                  rows={4}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-violet-600 focus:ring-violet-500 bg-[var(--background)]"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-[var(--heading)] select-none">Make bundle active and visible in marketplace</label>
              </div>
            </div>

            {/* Included Items Configuration */}
            <div className="space-y-4 border-t md:border-t-0 md:border-l border-[var(--border)] md:pl-6 pt-6 md:pt-0">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Included Items</label>
                
                {/* Selector Dropdown to add items */}
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value
                    if (!val) return
                    if (val === 'phone_number') {
                      handleAddProduct('phone_number')
                    } else {
                      handleAddProduct('agent', val)
                    }
                  }}
                  className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--heading)] focus:outline-none cursor-pointer hover:border-violet-500 transition-colors"
                >
                  <option value="">+ Add item to bundle...</option>
                  <option value="sales">Sales Agent</option>
                  <option value="support">Support Agent</option>
                  <option value="appointment">Appointment Agent</option>
                  <option value="lead_qualifier">Lead Qualifier</option>
                  <option value="multi_agent">Multi Agent</option>
                  <option value="phone_number">Phone Number Slot</option>
                </select>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                    No items included yet. Select an item from the dropdown above.
                  </div>
                ) : (
                  products.map((prod, idx) => {
                    const itemLabel = prod.type === 'phone_number' 
                      ? 'Phone Number Slot'
                      : prod.agent_type 
                        ? `${prod.agent_type.replace('_', ' ')} Agent`
                        : 'Agent'
                    
                    return (
                      <div key={idx} className="p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-xl relative space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--heading)] capitalize">{itemLabel}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(idx)}
                            className="text-red-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Quantity</label>
                            <input
                              type="number"
                              value={prod.quantity}
                              onChange={(e) => handleProductChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--heading)] focus:outline-none font-mono"
                              min="1"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Indiv. Price (₹)</label>
                            <input
                              type="number"
                              value={prod.individual_price / 100}
                              onChange={(e) => handleProductChange(idx, 'individual_price', Math.max(0, Math.round(Number(e.target.value) * 100)))}
                              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--heading)] focus:outline-none font-mono"
                              min="0"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-[var(--muted)] mb-1">Bundle Price (₹)</label>
                            <input
                              type="number"
                              value={prod.bundle_price / 100}
                              onChange={(e) => handleProductChange(idx, 'bundle_price', Math.max(0, Math.round(Number(e.target.value) * 100)))}
                              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs text-[var(--heading)] focus:outline-none font-mono"
                              min="0"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Computed Bundle Savings Summary */}
          <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Bundle Value</div>
              <div className="text-xl font-extrabold font-display text-violet-400 mt-0.5">
                ₹{(totalBundlePaisa / 100).toLocaleString('en-IN')}{' '}
                <span className="text-xs text-zinc-500 font-normal line-through ml-2 font-mono">
                  ₹{(totalIndividualPaisa / 100).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right font-medium text-xs text-violet-400">
              You save: <span className="font-extrabold font-mono text-sm">₹{(totalSavingsPaisa / 100).toLocaleString('en-IN')}</span> ({savingsPct}%)
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setEditingBundle(null)
              }}
              className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-550 text-white text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : editingBundle ? 'Update Bundle' : 'Save Bundle'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Bundles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bundles.map((bundle) => (
          <div key={bundle.id} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-sm">
            {/* Active/Inactive Badge */}
            <div className="absolute top-4 right-4">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                bundle.is_active 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
              }`}>
                {bundle.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[var(--heading)] font-display pr-16">{bundle.name}</h3>
                <p className="text-xs text-[var(--muted)] mt-1.5 line-clamp-2">{bundle.description || 'No description provided.'}</p>
              </div>

              {/* Product breakdown list */}
              <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 space-y-1.5 text-xs text-[var(--heading)]">
                <div className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider mb-1">Bundle Contents</div>
                {(() => {
                  const productsObj = bundle.products as any
                  const items = Array.isArray(productsObj) 
                    ? productsObj 
                    : (productsObj?.items || [])
                  return items.map((item: any, idx: number) => {
                    let label = ''
                    if (item.type === 'agent') {
                      const agentLabel = item.agent_type ? `${item.agent_type.replace('_', ' ')} Agent` : 'Agent'
                      label = `${agentLabel}`
                    } else {
                      label = 'Phone Number Slot'
                    }
                    return (
                      <div key={idx} className="flex justify-between items-center capitalize">
                        <span className="font-medium text-zinc-300">{label}</span>
                        <span className="font-mono font-bold text-violet-400">x{item.quantity}</span>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Price comparison */}
              <div className="flex items-end justify-between border-t border-[var(--border)] pt-4">
                <div>
                  <div className="text-[9px] text-[var(--muted)] uppercase font-bold tracking-wider">Bundle Offer Price</div>
                  <div className="text-xl font-bold font-display text-violet-500 mt-0.5">
                    ₹{(bundle.bundle_price_paisa / 100).toLocaleString('en-IN')}
                    <span className="text-xs text-zinc-400 line-through ml-2 font-normal">
                      ₹{(bundle.individual_price_paisa / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[9px] text-[var(--muted)] uppercase font-bold tracking-wider">Purchase Count</div>
                  <div className="font-mono font-bold text-sm text-[var(--heading)] mt-0.5">{bundle.purchase_count}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleToggleActive(bundle)}
                className={`text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  bundle.is_active 
                    ? 'text-zinc-400 hover:text-zinc-500' 
                    : 'text-green-500 hover:text-green-400'
                }`}
              >
                {bundle.is_active ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                onClick={() => handleEditClick(bundle)}
                className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400 font-bold uppercase tracking-wider cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
