import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { MaterialRecord, SupplierRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface MaterialsSuppliersViewProps {
  initialTab?: 'materials' | 'suppliers';
}

export const MaterialsSuppliersView: React.FC<MaterialsSuppliersViewProps> = ({
  initialTab = 'materials',
}) => {
  const {
    materials,
    suppliers,
    taskMaterials,
    materialRequests,
    sites,
    projects,
    siteSupervisors,
    tasks,
    currentRole,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addSupplier,
    deleteSupplier,
    allocateTaskMaterial,
    submitMaterialRequest,
    updateMaterialRequestStatus,
  } = useWorkforce();

  const [activeTab, setActiveTab] = useState<'materials' | 'requests' | 'suppliers' | 'usage'>(
    initialTab
  );
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const canEdit =
    currentRole === 'Admin' ||
    currentRole === 'HR Manager' ||
    currentRole === 'Site Supervisor';
  const canApproveRequests = currentRole === 'Admin' || currentRole === 'HR Manager';

  // Material Form
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState(100);
  const [matUnit, setMatUnit] = useState('Bags (50kg)');
  const [matCost, setMatCost] = useState(410);

  // Material Request Form (Site Supervisor / Admin)
  const [reqSiteId, setReqSiteId] = useState<number>(sites[0]?.site_id || 1);
  const [reqMaterialId, setReqMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [reqQty, setReqQty] = useState<number>(50);
  const [reqNotes, setReqNotes] = useState<string>('');

  // Supplier Form with Quotation fields
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supMaterial, setSupMaterial] = useState('UltraTech OPC 53 Grade Cement');
  const [supQuoteRate, setSupQuoteRate] = useState(410);
  const [supQuoteUnit, setSupQuoteUnit] = useState('INR / Bag');
  const [supQuotedQty, setSupQuotedQty] = useState(500);

  // Task Material Usage Form
  const [tmTaskId, setTmTaskId] = useState<number>(tasks[0]?.task_id || 1);
  const [tmMaterialId, setTmMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [tmSupplierId, setTmSupplierId] = useState<number>(suppliers[0]?.supplier_id || 1);
  const [tmQtyUsed, setTmQtyUsed] = useState<number>(20);

  // Confirm Deletes
  const [deleteMatTarget, setDeleteMatTarget] = useState<MaterialRecord | null>(null);
  const [deleteSupTarget, setDeleteSupTarget] = useState<SupplierRecord | null>(null);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    await addMaterial({
      material_name: matName.trim(),
      quantity: matQty,
      unit: matUnit,
      cost: matCost,
    });
    setMatName('');
  };

  const handleCreateMaterialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.material_id === reqMaterialId);
    const site = sites.find((s) => s.site_id === reqSiteId);
    if (!mat || !site) return;

    await submitMaterialRequest({
      project_id: site.project_id,
      site_id: site.site_id,
      supervisor_id: site.supervisor_id || 1,
      material_id: mat.material_id,
      material_name: mat.material_name,
      unit: mat.unit,
      requested_qty: reqQty,
      approved_qty: 0,
      delivered_qty: 0,
      used_qty: 0,
      unit_cost: mat.cost,
      estimated_value: reqQty * mat.cost,
      actual_expenditure: 0,
      request_date: new Date().toISOString().slice(0, 10),
      notes: reqNotes.trim() || 'Required for ongoing site structural schedule.',
    });
    setReqNotes('');
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    await addSupplier({
      supplier_name: supName.trim(),
      phone: supPhone.trim() || '+91 22 4090 1122',
      address: supAddress.trim() || 'Mumbai, MH',
      status: 'ACTIVE',
      supplied_materials: supMaterial,
      quotation_rate: supQuoteRate,
      quotation_unit: supQuoteUnit,
      quoted_quantity: supQuotedQty,
      total_quotation_amount: supQuoteRate * supQuotedQty,
      delivery_status: 'PENDING_DELIVERY',
    });
    setSupName('');
    setSupPhone('');
    setSupAddress('');
  };

  const handleAllocateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find((m) => m.material_id === tmMaterialId);
    if (!mat) return;
    await allocateTaskMaterial({
      task_id: tmTaskId,
      material_id: tmMaterialId,
      supplier_id: tmSupplierId,
      quantity_used: tmQtyUsed,
      unit_cost: mat.cost,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Construction Materials, Requisitions &amp; Suppliers
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to <code className="font-mono text-blue-700">public.materials</code>,{' '}
            <code className="font-mono text-blue-700">public.suppliers</code>, and{' '}
            <code className="font-mono text-blue-700">public.task_materials</code> · Includes
            Supervisor Material Requests &amp; Supplier Quotations
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 self-start gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventory ({materials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Site Requisitions ({materialRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Suppliers &amp; Quotes ({suppliers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usage')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
              activeTab === 'usage'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Site Material Usage ({taskMaterials.length})
          </button>
        </div>
      </div>

      {/* TAB 1: MATERIALS INVENTORY */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Material Name</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Inventory Value</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {materials.map((mat) => (
                    <tr key={mat.material_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          #{mat.material_id} · {mat.material_name}
                        </div>
                        <div className="text-[11px] text-slate-500">Unit: {mat.unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          aria-label={`Quantity for ${mat.material_name}`}
                          min={0}
                          disabled={!canEdit}
                          value={mat.quantity}
                          onChange={(e) =>
                            updateMaterial(mat.material_id, { quantity: Number(e.target.value) })
                          }
                          className="w-24 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-slate-900"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        INR {mat.cost.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        INR {(mat.quantity * mat.cost).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                            mat.status === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : mat.status === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {mat.status !== 'IN_STOCK' && <AlertTriangle className="w-3 h-3" />}
                          {mat.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setDeleteMatTarget(mat)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canEdit && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Add Construction Material
              </h3>
              <form onSubmit={handleAddMaterial} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Material Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ready-Mix Concrete M40"
                    value={matName}
                    onChange={(e) => setMatName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={matQty}
                      onChange={(e) => setMatQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={matUnit}
                      onChange={(e) => setMatUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (INR)</label>
                  <input
                    type="number"
                    min={1}
                    value={matCost}
                    onChange={(e) => setMatCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Save Material
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SITE MATERIAL REQUISITIONS & ADMIN APPROVALS */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Site Material Requisition &amp; Expenditure Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Tracks requested, approved, delivered, and used quantities per site
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Site &amp; Supervisor</th>
                    <th className="py-3 px-4">Material</th>
                    <th className="py-3 px-4">Req / Appr / Used Qty</th>
                    <th className="py-3 px-4">Est. Value / Actual Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Approval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {materialRequests.map((req) => {
                    const site = sites.find((s) => s.site_id === req.site_id);
                    const proj = projects.find((p) => p.project_id === req.project_id);
                    const sup = siteSupervisors.find((s) => s.supervisor_id === req.supervisor_id);

                    return (
                      <tr key={req.request_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {site?.site_name || `Site #${req.site_id}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {proj?.project_name} · Sup: {sup?.name || 'Site Engineer'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{req.material_name}</div>
                          <div className="text-[11px] text-slate-500">{req.notes}</div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div>
                            Req: <strong>{req.requested_qty}</strong> · Appr:{' '}
                            <strong>{req.approved_qty}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Delivered: {req.delivered_qty} · Used: {req.used_qty} ({req.unit})
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-900">
                            Est: INR {req.estimated_value.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-emerald-700">
                            Spent: INR {req.actual_expenditure.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                              req.status === 'APPROVED' || req.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {req.status === 'PENDING' && canApproveRequests ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateMaterialRequestStatus(
                                    req.request_id,
                                    'APPROVED',
                                    req.requested_qty
                                  )
                                }
                                className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateMaterialRequestStatus(req.request_id, 'REJECTED', 0)
                                }
                                className="px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-semibold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400">
                              {req.request_date}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {canEdit && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-700" />
                <span>Request Site Materials</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Submit a material requisition for Admin approval
              </p>
              <form onSubmit={handleCreateMaterialRequest} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Construction Site
                  </label>
                  <select
                    value={reqSiteId}
                    onChange={(e) => setReqSiteId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {sites.map((s) => (
                      <option key={s.site_id} value={s.site_id}>
                        {s.site_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material</label>
                  <select
                    value={reqMaterialId}
                    onChange={(e) => setReqMaterialId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {materials.map((m) => (
                      <option key={m.material_id} value={m.material_id}>
                        {m.material_name} (INR {m.cost}/{m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requested Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={reqQty}
                    onChange={(e) => setReqQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requirement Notes / Justification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Required for Podium Slab Pouring"
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Submit Material Requisition
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUPPLIERS & QUOTATIONS */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Supplier Name &amp; Contact</th>
                    <th className="py-3 px-4">Supplied Materials</th>
                    <th className="py-3 px-4">Quotation Rate &amp; Qty</th>
                    <th className="py-3 px-4">Quoted Value</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {suppliers.map((sup) => (
                    <tr key={sup.supplier_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          #{sup.supplier_id} · {sup.supplier_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {sup.phone} · {sup.address}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {sup.supplied_materials || 'Structural Materials & Aggregates'}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div>
                          INR {sup.quotation_rate || 410} ({sup.quotation_unit || 'per unit'})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Quoted Qty: {sup.quoted_quantity || 500}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        INR {(sup.total_quotation_amount || 205000).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          {sup.delivery_status || sup.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setDeleteSupTarget(sup)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canEdit && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Register Supplier &amp; Quotation
              </h3>
              <form onSubmit={handleAddSupplier} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplied Material
                  </label>
                  <input
                    type="text"
                    value={supMaterial}
                    onChange={(e) => setSupMaterial(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Quoted Rate (INR)
                    </label>
                    <input
                      type="number"
                      value={supQuoteRate}
                      onChange={(e) => setSupQuoteRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quoted Qty</label>
                    <input
                      type="number"
                      value={supQuotedQty}
                      onChange={(e) => setSupQuotedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate Unit</label>
                  <input
                    type="text"
                    value={supQuoteUnit}
                    onChange={(e) => setSupQuoteUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Save Supplier &amp; Quotation
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TASK MATERIALS USAGE */}
      {activeTab === 'usage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Task &amp; Site</th>
                    <th className="py-3 px-4">Material Used</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Quantity Used</th>
                    <th className="py-3 px-4">Total Expenditure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {taskMaterials.map((tm) => {
                    const task = tasks.find((t) => t.task_id === tm.task_id);
                    const site = sites.find((s) => s.site_id === task?.site_id);
                    const mat = materials.find((m) => m.material_id === tm.material_id);
                    const sup = suppliers.find((s) => s.supplier_id === tm.supplier_id);
                    return (
                      <tr key={tm.task_material_id}>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {task?.task_name || `Task #${tm.task_id}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {site?.site_name || 'Site'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {mat?.material_name || `Material #${tm.material_id}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sup?.supplier_name || `Supplier #${tm.supplier_id}`}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {tm.quantity_used} {mat?.unit}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          INR {tm.total_cost.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {canEdit && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Allocate Material to Site Task
              </h3>
              <form onSubmit={handleAllocateMaterial} className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Task</label>
                  <select
                    value={tmTaskId}
                    onChange={(e) => setTmTaskId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {tasks.map((t) => (
                      <option key={t.task_id} value={t.task_id}>
                        {t.task_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material</label>
                  <select
                    value={tmMaterialId}
                    onChange={(e) => setTmMaterialId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {materials.map((m) => (
                      <option key={m.material_id} value={m.material_id}>
                        {m.material_name} (Stock: {m.quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={tmSupplierId}
                    onChange={(e) => setTmSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Used</label>
                  <input
                    type="number"
                    min={1}
                    value={tmQtyUsed}
                    onChange={(e) => setTmQtyUsed(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] text-white font-semibold cursor-pointer"
                >
                  Record Material Usage
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteMatTarget)}
        title="Delete Material Record"
        message={`Are you sure you want to delete "${deleteMatTarget?.material_name}" from inventory?`}
        confirmLabel="Delete Material"
        onConfirm={() => {
          if (deleteMatTarget) deleteMaterial(deleteMatTarget.material_id);
        }}
        onCancel={() => setDeleteMatTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteSupTarget)}
        title="Delete Supplier"
        message={`Are you sure you want to delete supplier "${deleteSupTarget?.supplier_name}"?`}
        confirmLabel="Delete Supplier"
        onConfirm={() => {
          if (deleteSupTarget) deleteSupplier(deleteSupTarget.supplier_id);
        }}
        onCancel={() => setDeleteSupTarget(null)}
      />
    </div>
  );
};
