"use client";

import { useEffect, useState } from "react";
import { 
  Phone, Plus, Upload, Trash2, Edit2, Search, RefreshCw, 
  CheckCircle, AlertCircle, PhoneCall, Smartphone, MapPin, DollarSign, FileText
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPhoneNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Add Single Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    phone_number: "",
    city: "Mumbai",
    did_type: "mobile",
    provider: "voicelink",
    monthly_cost_paisa: 10000,
    retail_price_paisa: 29900
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [submittingCsv, setSubmittingCsv] = useState(false);

  // Edit Price Modal State
  const [editingNumber, setEditingNumber] = useState<any>(null);
  const [editPriceRupees, setEditPriceRupees] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const fetchPoolNumbers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/phone-numbers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch pool numbers");
      setNumbers(data.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load pool numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolNumbers();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.phone_number) {
      toast.error("Phone number is required");
      return;
    }

    try {
      setSubmittingAdd(true);
      const res = await fetch("/api/admin/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add number");
      
      toast.success("Phone number added to pool!");
      setIsAddModalOpen(false);
      setAddForm({
        phone_number: "",
        city: "Mumbai",
        did_type: "mobile",
        provider: "voicelink",
        monthly_cost_paisa: 10000,
        retail_price_paisa: 29900
      });
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "Failed to add number");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      toast.error("CSV content is empty");
      return;
    }

    // Parse CSV lines: phone_number,city,did_type,provider,retail_price
    const lines = csvContent.trim().split("\n");
    const parsedRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("phone_number") || line.startsWith("#")) continue;

      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        const phone = parts[0];
        const city = parts[1] || "Mumbai";
        const did_type = parts[2] || "mobile";
        const provider = parts[3] || "voicelink";
        const retailPriceRupees = parts[4] ? parseFloat(parts[4]) : 299;

        parsedRows.push({
          phone_number: phone,
          city,
          did_type,
          provider,
          monthly_cost_paisa: 10000,
          retail_price_paisa: Math.round(retailPriceRupees * 100)
        });
      }
    }

    if (parsedRows.length === 0) {
      toast.error("No valid lines found in CSV");
      return;
    }

    try {
      setSubmittingCsv(true);
      const res = await fetch("/api/admin/phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: parsedRows })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV Import failed");

      toast.success(`Imported ${data.count || parsedRows.length} phone numbers!`);
      setIsCsvModalOpen(false);
      setCsvContent("");
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "CSV Import failed");
    } finally {
      setSubmittingCsv(false);
    }
  };

  const handleEditPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNumber) return;

    const priceRupees = parseFloat(editPriceRupees);
    if (isNaN(priceRupees) || priceRupees <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await fetch("/api/admin/phone-numbers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingNumber.id,
          retail_price_paisa: Math.round(priceRupees * 100)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update price");

      toast.success("Retail price updated!");
      setEditingNumber(null);
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update price");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteNumber = async (id: string, phone: string) => {
    if (!confirm(`Are you sure you want to remove ${phone} from the pool?`)) return;

    try {
      const res = await fetch(`/api/admin/phone-numbers?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete number");

      toast.success("Number removed from pool");
      fetchPoolNumbers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete number");
    }
  };

  const filteredNumbers = numbers.filter((num) => {
    const matchesSearch = 
      num.phone_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      num.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      num.provider?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === "available") return matchesSearch && num.status === "available";
    if (filterStatus === "assigned") return matchesSearch && num.status === "assigned";
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto font-[family-name:var(--font-montserrat)] text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-playfair text-[var(--heading)] flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-violet-500" />
            Phone Number Pool Management
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium">
            Manage shared pre-purchased inventory numbers available for user purchase.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--secondary)] text-[var(--heading)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-600/20 transition-all"
          >
            <Plus size={14} /> Add Number
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Total Pool Inventory</p>
            <h3 className="text-2xl font-black text-[var(--heading)] mt-1">{numbers.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500">
            <Phone size={20} />
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Available for Purchase</p>
            <h3 className="text-2xl font-black text-emerald-500 mt-1">
              {numbers.filter(n => n.status === 'available').length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Assigned / Sold</p>
            <h3 className="text-2xl font-black text-amber-500 mt-1">
              {numbers.filter(n => n.status === 'assigned').length}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Smartphone size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by phone, city, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === "all"
                ? "bg-violet-600 text-white"
                : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
            }`}
          >
            All ({numbers.length})
          </button>
          <button
            onClick={() => setFilterStatus("available")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === "available"
                ? "bg-emerald-600 text-white"
                : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
            }`}
          >
            Available
          </button>
          <button
            onClick={() => setFilterStatus("assigned")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === "assigned"
                ? "bg-amber-600 text-white"
                : "bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)]"
            }`}
          >
            Assigned
          </button>
          <button
            onClick={fetchPoolNumbers}
            className="p-2 rounded-lg bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)] ml-auto"
            title="Refresh Table"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Numbers Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin w-4 h-4 text-violet-500" /> Loading pool inventory...
          </div>
        ) : filteredNumbers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--muted)]">
            No numbers found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--heading)]">
              <thead className="bg-[var(--secondary)] border-b border-[var(--border)] uppercase tracking-wider text-[10px] font-bold text-[var(--muted)]">
                <tr>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4">City / Region</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Retail Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Org / Agent</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredNumbers.map((num) => (
                  <tr key={num.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sm">
                      {num.phone_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {num.city || "Mumbai"}
                    </td>
                    <td className="py-3.5 px-4 uppercase font-semibold text-[11px] text-[var(--muted)]">
                      {num.did_type || "mobile"}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-[11px] text-[var(--muted)]">
                      {num.provider || "voicelink"}
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-emerald-400">
                      ₹{((num.retail_price_paisa || 29900) / 100).toFixed(2)}/mo
                    </td>
                    <td className="py-3.5 px-4">
                      {num.status === "available" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Available
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Assigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[var(--muted)]">
                      {num.assigned_organization ? (
                        <div>
                          <p className="text-[var(--heading)] font-semibold">{num.assigned_organization.name}</p>
                          {num.assigned_agent && (
                            <p className="text-[10px] text-violet-400">Agent: {num.assigned_agent.name}</p>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-[10px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingNumber(num);
                            setEditPriceRupees(((num.retail_price_paisa || 29900) / 100).toString());
                          }}
                          className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--secondary)] text-[var(--muted)] hover:text-[var(--heading)] transition-all"
                          title="Edit Retail Price"
                        >
                          <Edit2 size={13} />
                        </button>
                        {num.status !== "assigned" && (
                          <button
                            onClick={() => handleDeleteNumber(num.id, num.phone_number)}
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                            title="Remove from Pool"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Single Number Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-playfair text-[var(--heading)] mb-4 flex items-center gap-2">
              <Plus className="text-violet-500" size={20} />
              Add Number to Pool
            </h3>

            <form onSubmit={handleAddSingle} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Phone Number (with Country Code)</label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={addForm.phone_number}
                  onChange={(e) => setAddForm({ ...addForm, phone_number: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] font-mono outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Number Type</label>
                  <select
                    value={addForm.did_type}
                    onChange={(e) => setAddForm({ ...addForm, did_type: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] outline-none focus:border-violet-500"
                  >
                    <option value="mobile">Mobile</option>
                    <option value="landline">Landline</option>
                    <option value="tollfree">Toll-Free</option>
                    <option value="local">Local</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Provider</label>
                  <select
                    value={addForm.provider}
                    onChange={(e) => setAddForm({ ...addForm, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] outline-none focus:border-violet-500"
                  >
                    <option value="voicelink">VoiceLink (IN)</option>
                    <option value="twilio">Twilio (US/Global)</option>
                    <option value="simulated">Simulated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Retail Price (₹/mo)</label>
                  <input
                    type="number"
                    placeholder="299"
                    value={addForm.retail_price_paisa / 100}
                    onChange={(e) => setAddForm({ ...addForm, retail_price_paisa: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] font-mono outline-none focus:border-violet-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {submittingAdd ? <RefreshCw className="animate-spin" size={14} /> : "Save to Pool"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-playfair text-[var(--heading)] mb-2 flex items-center gap-2">
              <Upload className="text-violet-500" size={20} />
              Import Phone Numbers via CSV
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Paste CSV content with format: <code className="text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded">phone_number, city, did_type, provider, price_rupees</code>
            </p>

            <form onSubmit={handleCsvImport} className="space-y-4 text-xs">
              <div>
                <textarea
                  rows={8}
                  placeholder={`+919876543210, Mumbai, mobile, voicelink, 299\n+919876543211, Delhi, mobile, voicelink, 299\n+12125550199, New York, local, twilio, 499`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] font-mono text-xs outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCsv}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {submittingCsv ? <RefreshCw className="animate-spin" size={14} /> : "Import All"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Price Modal */}
      {editingNumber && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--heading)] mb-1">Edit Retail Price</h3>
            <p className="text-xs text-[var(--muted)] mb-4 font-mono">{editingNumber.phone_number}</p>

            <form onSubmit={handleEditPrice} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[var(--muted)] mb-1">Monthly Retail Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPriceRupees}
                  onChange={(e) => setEditPriceRupees(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--heading)] font-mono outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingNumber(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--muted)] font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {submittingEdit ? <RefreshCw className="animate-spin" size={14} /> : "Update Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
