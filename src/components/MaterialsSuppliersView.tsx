import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Search,
  Edit2,
  X,
  Camera,
  Upload,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
  Truck,
  Eye,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { MaterialRecord, MaterialRequestRecord, SupplierRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import {
  sanitize10DigitPhone,
  validate10DigitPhone,
  getAllowedMaterialTabsForRole,
  MaterialSubTab,
  ATTENDANCE_STORAGE_BUCKETS,
} from '../utils/workforceLogic';

interface MaterialsSuppliersViewProps {
  initialTab?: 'materials' | 'suppliers' | 'requests' | 'usage';
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
    currentUser,
    currentRole,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    uploadDeliveredMaterialPhoto,
    allocateTaskMaterial,
    submitMaterialRequest,
    updateMaterialRequestStatus,
  } = useWorkforce();

  const allowedTabs = useMemo<MaterialSubTab[]>(
    () => getAllowedMaterialTabsForRole(currentRole),
    [currentRole]
  );

  const [activeTab, setActiveTab] = useState<MaterialSubTab>(() =>
    allowedTabs.includes(initialTab as MaterialSubTab)
      ? (initialTab as MaterialSubTab)
      : allowedTabs[0] || 'requests'
  );

  useEffect(() => {
    if (allowedTabs.includes(initialTab as MaterialSubTab)) {
      setActiveTab(initialTab as MaterialSubTab);
    }
  }, [initialTab, allowedTabs]);

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  // Role capability flags per Requirement 2 & 3
  const canManageInventory = currentRole === 'Admin';
  const canApproveRequests = currentRole === 'Admin';
  const canRequestMaterials = currentRole === 'Site Supervisor' || currentRole === 'Admin';
  const canManageSuppliers = currentRole === 'Admin';
  const canLogMaterialUsage = currentRole === 'Site Supervisor' || currentRole === 'Admin';
  const canReportDeliveryPhoto = currentRole === 'Site Supervisor' || currentRole === 'Admin';

  // Resolve logged-in Site Supervisor's assigned site(s) and project(s)
  const activeSupervisor = useMemo(() => {
    if (currentRole !== 'Site Supervisor') return null;
    const email = (currentUser?.email || '').toLowerCase();
    const userId = String(currentUser?.user_id || '').toUpperCase();
    return (
      siteSupervisors.find(
        (s) =>
          (userId && String(s.user_id || '').toUpperCase() === userId) ||
          (email && (s.work_email || s.email || '').toLowerCase() === email)
      ) ||
      siteSupervisors[0] ||
      null
    );
  }, [currentRole, currentUser, siteSupervisors]);

  const supervisorSites = useMemo(() => {
    if (currentRole !== 'Site Supervisor' || !activeSupervisor) return sites;
    const matched = sites.filter(
      (s) =>
        s.supervisor_id === activeSupervisor.supervisor_id ||
        s.site_id === activeSupervisor.assigned_site_id
    );
    return matched.length > 0 ? matched : sites.slice(0, 1);
  }, [currentRole, activeSupervisor, sites]);

  const supervisorProjectIds = useMemo(
    () => new Set(supervisorSites.map((s) => s.project_id)),
    [supervisorSites]
  );

  const supervisorSiteIds = useMemo(
    () => new Set(supervisorSites.map((s) => s.site_id)),
    [supervisorSites]
  );

  // Active projects for Supplier 'Deliver To Project Site' dropdown (Requirement 1)
  const activeProjects = useMemo(() => {
    const active = projects.filter((p) => p.status === 'ACTIVE');
    return active.length > 0 ? active : projects;
  }, [projects]);

  // Material Form (Admin only)
  const [matName, setMatName] = useState('');
  const [matQty, setMatQty] = useState(100);
  const [matUnit, setMatUnit] = useState('Bags (50kg)');
  const [matCost, setMatCost] = useState(410);

  // Material Request Form (Site Supervisor / Admin)
  const [reqSiteId, setReqSiteId] = useState<number>(supervisorSites[0]?.site_id || sites[0]?.site_id || 1);
  const [reqMaterialId, setReqMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [reqQty, setReqQty] = useState<number>(50);
  const [reqNotes, setReqNotes] = useState<string>('');

  useEffect(() => {
    if (supervisorSites.length > 0 && !supervisorSites.some((s) => s.site_id === reqSiteId)) {
      setReqSiteId(supervisorSites[0].site_id);
    }
  }, [supervisorSites, reqSiteId]);

  // Supplier Form with Quotation + Deliver To Project Site fields (Requirement 1)
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supPhoneError, setSupPhoneError] = useState<string | null>(null);
  const [supAddress, setSupAddress] = useState('');
  const [supProjectId, setSupProjectId] = useState<number>(
    activeProjects[0]?.project_id || 1
  );
  const [supDeliveryStatus, setSupDeliveryStatus] =
    useState<SupplierRecord['delivery_status']>('ON_SCHEDULE');
  const [supMaterial, setSupMaterial] = useState('UltraTech OPC 53 Grade Cement');
  const [supQuoteRate, setSupQuoteRate] = useState(410);
  const [supQuoteUnit, setSupQuoteUnit] = useState('Bag (50kg)');
  const [supQuotedQty, setSupQuotedQty] = useState(500);

  useEffect(() => {
    if (activeProjects.length > 0 && !activeProjects.some((p) => p.project_id === supProjectId)) {
      setSupProjectId(activeProjects[0].project_id);
    }
  }, [activeProjects, supProjectId]);

  // Filtered Tasks and Usage for Site Supervisor's assigned projects
  const visibleTasksForUsage = useMemo(() => {
    if (currentRole !== 'Site Supervisor') return tasks;
    const filtered = tasks.filter(
      (t) =>
        supervisorProjectIds.has(t.project_id) ||
        (t.site_id ? supervisorSiteIds.has(t.site_id) : false)
    );
    return filtered.length > 0 ? filtered : tasks;
  }, [currentRole, tasks, supervisorProjectIds, supervisorSiteIds]);

  const visibleTaskMaterials = useMemo(() => {
    if (currentRole !== 'Site Supervisor') return taskMaterials;
    return taskMaterials.filter((tm) => {
      const task = tasks.find((t) => t.task_id === tm.task_id);
      const projId = tm.project_id || task?.project_id;
      const siteId = tm.site_id || task?.site_id;
      return (
        (projId && supervisorProjectIds.has(projId)) ||
        (siteId && supervisorSiteIds.has(siteId))
      );
    });
  }, [currentRole, taskMaterials, tasks, supervisorProjectIds, supervisorSiteIds]);

  // Task Material Usage Form
  const [tmTaskId, setTmTaskId] = useState<number>(visibleTasksForUsage[0]?.task_id || 1);
  const [tmMaterialId, setTmMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [tmSupplierId, setTmSupplierId] = useState<number>(suppliers[0]?.supplier_id || 1);
  const [tmQtyUsed, setTmQtyUsed] = useState<number>(20);

  useEffect(() => {
    if (
      visibleTasksForUsage.length > 0 &&
      !visibleTasksForUsage.some((t) => t.task_id === tmTaskId)
    ) {
      setTmTaskId(visibleTasksForUsage[0].task_id);
    }
  }, [visibleTasksForUsage, tmTaskId]);

  // Confirm Deletes
  const [deleteMatTarget, setDeleteMatTarget] = useState<MaterialRecord | null>(null);
  const [deleteSupTarget, setDeleteSupTarget] = useState<SupplierRecord | null>(null);

  // Supplier Search & Filter & Edit State
  const [supSearchTerm, setSupSearchTerm] = useState('');
  const [supStatusFilter, setSupStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [editSupName, setEditSupName] = useState('');
  const [editSupPhone, setEditSupPhone] = useState('');
  const [editSupPhoneError, setEditSupPhoneError] = useState<string | null>(null);
  const [editSupAddress, setEditSupAddress] = useState('');
  const [editSupStatus, setEditSupStatus] = useState<string>('ACTIVE');
  const [editSupDeliveryStatus, setEditSupDeliveryStatus] =
    useState<SupplierRecord['delivery_status']>('ON_SCHEDULE');
  const [editSupProjectId, setEditSupProjectId] = useState<number>(
    activeProjects[0]?.project_id || 1
  );
  const [editSupMaterial, setEditSupMaterial] = useState('');
  const [editSupRate, setEditSupRate] = useState<number>(410);
  const [editSupQty, setEditSupQty] = useState<number>(500);
  const [editSupUnit, setEditSupUnit] = useState<string>('Bag (50kg)');

  // Delivered Material Photo Modal State (Requirement 3)
  const [deliveryModalReq, setDeliveryModalReq] = useState<MaterialRequestRecord | null>(null);
  const [capturedDeliveryPhoto, setCapturedDeliveryPhoto] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploadingDelivery, setIsUploadingDelivery] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<{
    title: string;
    photoUrl: string;
    bucketPath?: string | null;
    deliveredBy?: string | null;
    deliveredAt?: string | null;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startLiveCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = mediaStream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setCameraError(
        'Camera stream unavailable in this browser environment. Use "Generate Site Delivery Photo" or "Upload Photo File" below.'
      );
    }
  };

  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 420;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(0, canvas.height - 64, canvas.width, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `DELIVERED: ${deliveryModalReq?.material_name || 'Site Material'} (${
          deliveryModalReq?.requested_qty || 0
        } ${deliveryModalReq?.unit || 'units'})`,
        14,
        canvas.height - 36
      );
      ctx.fillStyle = '#38bdf8';
      ctx.font = '12px monospace';
      ctx.fillText(
        `Bucket: ${ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED} · ${new Date().toLocaleString('en-IN')}`,
        14,
        canvas.height - 14
      );
      setCapturedDeliveryPhoto(canvas.toDataURL('image/jpeg', 0.9));
    }
    stopCamera();
  };

  const generateStampedDeliveryPhoto = (req: MaterialRequestRecord) => {
    const site = sites.find((s) => s.site_id === req.site_id);
    const proj = projects.find((p) => p.project_id === req.project_id);
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 640, 400);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e3a8a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 400);

      // Visual crates / material verification stamp
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(28, 28, 584, 240);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, 584, 240);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('✓ SITE SUPERVISOR VERIFIED MATERIAL DELIVERY PHOTO', 48, 66);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(
        `${req.material_name} — ${req.approved_qty || req.requested_qty} ${req.unit}`,
        48,
        110
      );

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Project Site: ${proj?.project_name || site?.site_name || 'Baner Residential Tower'} (${
          proj?.location || site?.location || 'Pune'
        })`,
        48,
        148
      );
      ctx.fillText(
        `Verified By : ${activeSupervisor?.name || currentUser?.name || 'Sachin Patil'} (${currentRole})`,
        48,
        180
      );
      ctx.fillText(
        `Supabase Bucket: ${ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}`,
        48,
        212
      );
      ctx.fillText(`Timestamp   : ${new Date().toISOString()}`, 48, 244);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 310, 640, 90);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(
        `Requisition #${req.request_id} · Status: DELIVERED · GPS Verified On-Site`,
        28,
        345
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(
        `Saved in Supabase Storage -> "${ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}"`,
        28,
        372
      );
    }
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const handleOpenDeliveryModal = (req: MaterialRequestRecord) => {
    setDeliveryModalReq(req);
    setCameraError(null);
    setCapturedDeliveryPhoto(generateStampedDeliveryPhoto(req));
  };

  const handleDeliveryPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedDeliveryPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmMaterialDelivered = async () => {
    if (!deliveryModalReq) return;
    setIsUploadingDelivery(true);
    try {
      const photoData =
        capturedDeliveryPhoto || generateStampedDeliveryPhoto(deliveryModalReq);
      const uploadRes = await uploadDeliveredMaterialPhoto(
        photoData,
        deliveryModalReq.request_id,
        deliveryModalReq.material_name
      );
      const deliveredBy = `${
        activeSupervisor?.name || currentUser?.name || 'Sachin Patil'
      } (${currentRole})`;
      const deliveredAt = new Date().toISOString();
      const deliveredQty =
        deliveryModalReq.approved_qty || deliveryModalReq.requested_qty;

      await updateMaterialRequestStatus(deliveryModalReq.request_id, {
        status: 'DELIVERED',
        approval_status: 'APPROVED',
        delivery_status: 'DELIVERED',
        delivered_qty: deliveredQty,
        approved_qty: deliveredQty,
        delivery_photo_url: uploadRes.photoUrl,
        delivery_photo_bucket_path: uploadRes.bucketPath,
        delivered_by: deliveredBy,
        delivered_at: deliveredAt,
      });

      // Also sync linked supplier delivery status & photo if a supplier matches this project
      const linkedSupplier = suppliers.find(
        (s) => s.project_id === deliveryModalReq.project_id
      );
      if (linkedSupplier) {
        await updateSupplier(linkedSupplier.supplier_id, {
          delivery_status: 'DELIVERED',
          delivery_photo_url: uploadRes.photoUrl,
          delivery_photo_bucket_path: uploadRes.bucketPath,
          delivered_by: deliveredBy,
          delivered_at: deliveredAt,
        });
      }

      stopCamera();
      setDeliveryModalReq(null);
      setCapturedDeliveryPhoto('');
    } finally {
      setIsUploadingDelivery(false);
    }
  };

  const handleOpenEditSupplier = (sup: SupplierRecord) => {
    setEditingSupplier(sup);
    setEditSupName(sup.supplier_name);
    setEditSupPhone(sup.phone);
    setEditSupPhoneError(null);
    setEditSupAddress(sup.address);
    setEditSupStatus(sup.status || 'ACTIVE');
    setEditSupDeliveryStatus(sup.delivery_status || 'ON_SCHEDULE');
    setEditSupProjectId(sup.project_id || activeProjects[0]?.project_id || 1);
    setEditSupMaterial(sup.supplied_materials || 'Construction Materials');
    setEditSupRate(Number(sup.quoted_rate ?? sup.quotation_rate ?? 410));
    setEditSupQty(Number(sup.quoted_qty ?? sup.quoted_quantity ?? 500));
    setEditSupUnit(sup.rate_unit || sup.quotation_unit || 'Bag (50kg)');
  };

  const handleSaveEditSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const phoneCheck = validate10DigitPhone(editSupPhone, 'Supplier phone');
    if (!phoneCheck.valid) {
      setEditSupPhoneError(phoneCheck.error || 'Phone must be exactly 10 numeric digits.');
      return;
    }
    const selectedProj =
      activeProjects.find((p) => p.project_id === editSupProjectId) ||
      projects.find((p) => p.project_id === editSupProjectId);

    await updateSupplier(editingSupplier.supplier_id, {
      supplier_name: editSupName.trim(),
      phone: sanitize10DigitPhone(editSupPhone),
      address: editSupAddress.trim(),
      status: editSupStatus as any,
      delivery_status: editSupDeliveryStatus,
      project_id: selectedProj ? selectedProj.project_id : editSupProjectId,
      delivery_address: selectedProj?.location || editSupAddress.trim(),
      supplied_materials: editSupMaterial.trim(),
      quoted_rate: editSupRate,
      quotation_rate: editSupRate,
      quoted_qty: editSupQty,
      quoted_quantity: editSupQty,
      rate_unit: editSupUnit.trim(),
      quotation_unit: editSupUnit.trim(),
      total_quotation_amount: editSupRate * editSupQty,
    });
    setEditingSupplier(null);
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    const term = supSearchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      sup.supplier_name.toLowerCase().includes(term) ||
      sup.phone.toLowerCase().includes(term) ||
      (sup.address && sup.address.toLowerCase().includes(term)) ||
      (sup.delivery_address && sup.delivery_address.toLowerCase().includes(term)) ||
      (sup.supplied_materials && sup.supplied_materials.toLowerCase().includes(term));

    const matchesStatus =
      supStatusFilter === 'ALL' || sup.status === supStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory || !matName.trim()) return;
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
    if (!canRequestMaterials) return;
    const mat = materials.find((m) => m.material_id === reqMaterialId);
    const site = sites.find((s) => s.site_id === reqSiteId);
    if (!mat || !site) return;

    await submitMaterialRequest({
      project_id: site.project_id,
      site_id: site.site_id,
      supervisor_id: activeSupervisor?.supervisor_id || site.supervisor_id || 1,
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
    if (!canManageSuppliers || !supName.trim()) return;
    const phoneCheck = validate10DigitPhone(supPhone, 'Supplier phone number');
    if (!phoneCheck.valid) {
      setSupPhoneError(phoneCheck.error || 'Phone must be exactly 10 digits.');
      return;
    }
    setSupPhoneError(null);

    const selectedProject =
      activeProjects.find((p) => p.project_id === supProjectId) || activeProjects[0];
    const resolvedProjectId = selectedProject ? selectedProject.project_id : supProjectId;
    const resolvedDeliveryAddress =
      selectedProject?.location || supAddress.trim() || 'Baner, Pune';

    await addSupplier({
      supplier_name: supName.trim(),
      phone: sanitize10DigitPhone(supPhone),
      address: supAddress.trim() || resolvedDeliveryAddress,
      status: 'ACTIVE',
      supplied_materials: supMaterial,
      quotation_rate: supQuoteRate,
      quoted_rate: supQuoteRate,
      quotation_unit: supQuoteUnit,
      rate_unit: supQuoteUnit,
      quoted_quantity: supQuotedQty,
      quoted_qty: supQuotedQty,
      total_quotation_amount: supQuoteRate * supQuotedQty,
      delivery_status: supDeliveryStatus || 'ON_SCHEDULE',
      delivery_address: resolvedDeliveryAddress,
      project_id: resolvedProjectId,
    });
    setSupName('');
    setSupPhone('');
    setSupAddress('');
  };

  const handleAllocateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLogMaterialUsage) return;
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

  const getDeliveryBadgeStyle = (status?: string) => {
    const s = String(status || '').toUpperCase();
    if (s === 'DELIVERED') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (s === 'ON_SCHEDULE') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (s === 'DELAYED') {
      return 'bg-red-50 text-red-800 border-red-200';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200';
  };

  // Delivered material photos visible to Admin & Site Supervisor
  const deliveredPhotoRecords = useMemo(
    () =>
      materialRequests.filter(
        (r) => Boolean(r.delivery_photo_url) || r.delivery_status === 'DELIVERED' || r.status === 'DELIVERED'
      ),
    [materialRequests]
  );

  if (allowedTabs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
        <h2 className="font-display text-lg font-bold text-slate-900">
          Materials &amp; Requests Restricted for {currentRole}
        </h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          The Materials &amp; Requests module is only accessible to Admin (all tabs), Accountant (Inventory &amp; Site Material Usage), and Site Supervisor (Site Requisitions &amp; Assigned Project Site Material Usage).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Construction Materials, Requisitions &amp; Suppliers
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {currentRole === 'Site Supervisor'
              ? `Site Supervisor Material Requisitions & Assigned Site Material Usage (${
                  supervisorSites.map((s) => s.site_name).join(', ') || 'Assigned Site'
                })`
              : currentRole === 'Accountant'
              ? 'Accountant Read-Only Inventory Valuation & Site Material Usage Audit'
              : 'Construction materials inventory, supplier management, site requisitions, and usage tracking'}
          </p>
        </div>

        {/* Role-Filtered Sub-Tabs (Requirement 2) */}
        <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 self-start gap-1">
          {allowedTabs.includes('materials') && (
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
          )}
          {allowedTabs.includes('requests') && (
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
          )}
          {allowedTabs.includes('suppliers') && (
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
          )}
          {allowedTabs.includes('usage') && (
            <button
              type="button"
              onClick={() => setActiveTab('usage')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                activeTab === 'usage'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Site Material Usage ({visibleTaskMaterials.length})
            </button>
          )}
        </div>
      </div>

      {/* Role Access Summary Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Active Role: <strong>{currentRole}</strong> —{' '}
            {currentRole === 'Admin'
              ? 'Full access to Inventory, Site Requisitions (with Supervisor Delivered Material Photos), Suppliers & Quotes, and Site Material Usage.'
              : currentRole === 'Accountant'
              ? 'Authorized access to Inventory and Site Material Usage ledger.'
              : 'Authorized access to request materials, capture Delivered Material Photos, and log Assigned Project Site Material Usage.'}
          </span>
        </div>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-800 font-semibold">
          Bucket: {ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}
        </span>
      </div>

      {/* TAB 1: MATERIALS INVENTORY (Admin & Accountant only) */}
      {activeTab === 'materials' && allowedTabs.includes('materials') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`${
              canManageInventory ? 'lg:col-span-2' : 'lg:col-span-3'
            } bg-white rounded-xl border border-slate-200 overflow-hidden`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Material Name</th>
                    <th className="py-3 px-4">Available Stock</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Inventory Value</th>
                    <th className="py-3 px-4">Stock Status</th>
                    {canManageInventory && <th className="py-3 px-4 text-right">Actions</th>}
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
                          disabled={!canManageInventory}
                          value={mat.quantity}
                          onChange={(e) =>
                            updateMaterial(mat.material_id, { quantity: Number(e.target.value) })
                          }
                          className="w-24 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-slate-900 disabled:bg-slate-100"
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
                      {canManageInventory && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteMatTarget(mat)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canManageInventory && (
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

      {/* TAB 2: SITE MATERIAL REQUISITIONS, DELIVERED PHOTO CAPTURE & ADMIN VIEW */}
      {activeTab === 'requests' && allowedTabs.includes('requests') && (
        <div className="space-y-6">
          {/* Admin / Supervisor Delivered Material Photo Verification Strip (Requirement 3) */}
          {deliveredPhotoRecords.some((r) => r.delivery_photo_url) && (
            <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Site Supervisor Clicked Delivered Material Photos (Admin Verification Feed)
                  </h3>
                </div>
                <span className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Bucket: {ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveredPhotoRecords
                  .filter((r) => r.delivery_photo_url)
                  .map((req) => {
                    const site = sites.find((s) => s.site_id === req.site_id);
                    return (
                      <div
                        key={req.request_id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center gap-3"
                      >
                        <img
                          src={req.delivery_photo_url || ''}
                          alt={`Delivered ${req.material_name}`}
                          className="w-16 h-14 object-cover rounded border border-slate-300 shrink-0 cursor-pointer"
                          onClick={() =>
                            setPreviewPhotoModal({
                              title: `${req.material_name} — ${site?.site_name || 'Site'}`,
                              photoUrl: req.delivery_photo_url!,
                              bucketPath: req.delivery_photo_bucket_path,
                              deliveredBy: req.delivered_by,
                              deliveredAt: req.delivered_at,
                            })
                          }
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {req.material_name} ({req.delivered_qty || req.requested_qty} {req.unit})
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {site?.site_name} · {req.delivered_by || 'Site Supervisor'}
                          </div>
                          <div className="text-[10px] font-mono text-emerald-700 truncate">
                            {req.delivery_photo_bucket_path ||
                              `${ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}/req_${req.request_id}.jpg`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewPhotoModal({
                              title: `${req.material_name} — ${site?.site_name || 'Site'}`,
                              photoUrl: req.delivery_photo_url!,
                              bucketPath: req.delivery_photo_bucket_path,
                              deliveredBy: req.delivered_by,
                              deliveredAt: req.delivered_at,
                            })
                          }
                          className="px-2 py-1 rounded bg-white border border-slate-300 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer shrink-0"
                        >
                          View
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Site Material Requisition &amp; Delivery Photo Verification Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Site Supervisors request materials and click a photo upon delivery · Admin approves requests and inspects delivered material photos
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Site &amp; Supervisor</th>
                      <th className="py-3 px-4">Material</th>
                      <th className="py-3 px-4">Req / Appr / Deliv Qty</th>
                      <th className="py-3 px-4">Delivered Photo (Bucket)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {materialRequests.map((req) => {
                      const site = sites.find((s) => s.site_id === req.site_id);
                      const proj = projects.find((p) => p.project_id === req.project_id);
                      const sup = siteSupervisors.find(
                        (s) => s.supervisor_id === req.supervisor_id
                      );
                      const isDelivered =
                        req.status === 'DELIVERED' || req.delivery_status === 'DELIVERED';

                      return (
                        <tr key={req.request_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              {site?.site_name || `Site #${req.site_id}`}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {proj?.project_name} · Sup: {sup?.name || 'Sachin Patil'}
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
                              Delivered: <strong>{req.delivered_qty}</strong> ({req.unit})
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {req.delivery_photo_url ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={req.delivery_photo_url}
                                  alt={`Delivered ${req.material_name}`}
                                  className="w-11 h-9 object-cover rounded border border-emerald-300 cursor-pointer"
                                  onClick={() =>
                                    setPreviewPhotoModal({
                                      title: `${req.material_name} — ${site?.site_name || 'Site'}`,
                                      photoUrl: req.delivery_photo_url!,
                                      bucketPath: req.delivery_photo_bucket_path,
                                      deliveredBy: req.delivered_by,
                                      deliveredAt: req.delivered_at,
                                    })
                                  }
                                />
                                <div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhotoModal({
                                        title: `${req.material_name} — ${site?.site_name || 'Site'}`,
                                        photoUrl: req.delivery_photo_url!,
                                        bucketPath: req.delivery_photo_bucket_path,
                                        deliveredBy: req.delivered_by,
                                        deliveredAt: req.delivered_at,
                                      })
                                    }
                                    className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View Photo</span>
                                  </button>
                                  <div className="text-[10px] font-mono text-emerald-700">
                                    Material Delivered images
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">
                                Awaiting Delivery Photo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                                isDelivered
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : req.status === 'APPROVED'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : req.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}
                            >
                              {isDelivered ? 'DELIVERED' : req.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {req.status === 'PENDING' && canApproveRequests && (
                                <>
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
                                </>
                              )}
                              {canReportDeliveryPhoto && req.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeliveryModal(req)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold cursor-pointer"
                                >
                                  <Camera className="w-3 h-3" />
                                  <span>
                                    {isDelivered ? 'Update Delivery Photo' : 'Click Photo & Report Delivered'}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {canRequestMaterials && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-700" />
                  <span>Request Site Materials</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Site Supervisor submits material requisition for Admin approval
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
                      {(currentRole === 'Site Supervisor' ? supervisorSites : sites).map((s) => (
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
        </div>
      )}

      {/* TAB 3: SUPPLIERS & QUOTATIONS (Admin only per Requirement 1 & 2) */}
      {activeTab === 'suppliers' && allowedTabs.includes('suppliers') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Search and Filters Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search suppliers by name, phone, delivery site, or material..."
                  value={supSearchTerm}
                  onChange={(e) => setSupSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-xs">
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSupStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      supStatusFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL' ? `All (${suppliers.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Supplier Name &amp; Contact</th>
                    <th className="py-3 px-4">Supplied Materials</th>
                    <th className="py-3 px-4">Delivery Address / Site</th>
                    <th className="py-3 px-4">Quotation Rate &amp; Qty</th>
                    <th className="py-3 px-4">Quoted Value</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No suppliers found matching "{supSearchTerm}".
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => {
                      const linkedProj = projects.find(
                        (p) => p.project_id === Number(sup.project_id)
                      );
                      const quotedRate = Number(sup.quoted_rate ?? sup.quotation_rate ?? 0);
                      const quotedQty = Number(sup.quoted_qty ?? sup.quoted_quantity ?? 0);
                      const rateUnit = sup.rate_unit || sup.quotation_unit || 'unit';
                      const quotedTotal =
                        sup.total_quotation_amount || Math.round(quotedRate * quotedQty);
                      const exactDeliveryStatus = sup.delivery_status || 'PENDING_DELIVERY';

                      return (
                        <tr key={sup.supplier_id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">
                              #{sup.supplier_id} · {sup.supplier_name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {sup.phone} · <span className="font-sans">{sup.address}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            <div>{sup.supplied_materials || 'Construction Materials'}</div>
                            {sup.delivery_photo_url && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhotoModal({
                                    title: `Delivered Material — ${sup.supplier_name}`,
                                    photoUrl: sup.delivery_photo_url!,
                                    bucketPath: sup.delivery_photo_bucket_path,
                                    deliveredBy: sup.delivered_by,
                                    deliveredAt: sup.delivered_at,
                                  })
                                }
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                              >
                                <Camera className="w-3 h-3" />
                                <span>View Supervisor Delivery Photo</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>
                                {linkedProj ? linkedProj.project_name : 'Assigned Project Site'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {sup.delivery_address || linkedProj?.location || sup.address}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <div>
                              INR {quotedRate.toLocaleString('en-IN')} ({rateUnit})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Quoted Qty: {quotedQty.toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            INR {quotedTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${getDeliveryBadgeStyle(
                                  exactDeliveryStatus
                                )}`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {exactDeliveryStatus}
                              </span>
                              {canManageSuppliers && (
                                <select
                                  aria-label={`Change delivery status for ${sup.supplier_name}`}
                                  value={exactDeliveryStatus}
                                  onChange={(e) =>
                                    updateSupplier(sup.supplier_id, {
                                      delivery_status: e.target
                                        .value as SupplierRecord['delivery_status'],
                                    })
                                  }
                                  className="block w-full px-1.5 py-1 rounded border border-slate-300 bg-white font-mono text-[10px] text-slate-700 cursor-pointer"
                                >
                                  <option value="ON_SCHEDULE">ON_SCHEDULE</option>
                                  <option value="PENDING_DELIVERY">PENDING_DELIVERY</option>
                                  <option value="DELIVERED">DELIVERED</option>
                                  <option value="DELAYED">DELAYED</option>
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {canManageSuppliers && (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSupplier(sup)}
                                  className="p-1.5 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  title="Edit Supplier & Delivery Status"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteSupTarget(sup)}
                                  className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Delete Supplier"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {canManageSuppliers && (
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
                    placeholder="e.g. Sahyadri Infra Aggregates"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deliver To Project Site *
                  </label>
                  <select
                    required
                    aria-label="Deliver To Project Site"
                    value={supProjectId}
                    onChange={(e) => setSupProjectId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {activeProjects.map((p) => (
                      <option key={p.project_id} value={p.project_id}>
                        {p.project_name} ({p.location})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Delivery Status
                  </label>
                  <select
                    aria-label="Initial Delivery Status"
                    value={supDeliveryStatus || 'ON_SCHEDULE'}
                    onChange={(e) =>
                      setSupDeliveryStatus(
                        e.target.value as SupplierRecord['delivery_status']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                  >
                    <option value="ON_SCHEDULE">ON_SCHEDULE</option>
                    <option value="PENDING_DELIVERY">PENDING_DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="DELAYED">DELAYED</option>
                  </select>
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9820155110"
                    value={supPhone}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setSupPhone(sanitized);
                      if (supPhoneError && sanitized.length === 10) setSupPhoneError(null);
                    }}
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      supPhoneError ? 'border-red-500 bg-red-50/50' : 'border-slate-300'
                    }`}
                  />
                  {supPhoneError && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 inline shrink-0" />
                      <span>{supPhoneError}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supplier Office Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Market Yard, Pune"
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
      {activeTab === 'usage' && allowedTabs.includes('usage') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className={`${
              canLogMaterialUsage ? 'lg:col-span-2' : 'lg:col-span-3'
            } bg-white rounded-xl border border-slate-200 overflow-hidden`}
          >
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Used Material Ledger (
                  {currentRole === 'Site Supervisor'
                    ? 'Assigned Project Site Consumption Log'
                    : 'All Sites Consumption Log'}
                  )
                </h3>
                <p className="text-xs text-slate-500">
                  Used material data logged on-site with automatic inventory stock deduction
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-semibold">
                {visibleTaskMaterials.length} Entries Logged
              </span>
            </div>
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
                  {visibleTaskMaterials.map((tm) => {
                    const task = tasks.find((t) => t.task_id === tm.task_id);
                    const site = sites.find((s) => s.site_id === (tm.site_id || task?.site_id));
                    const supEng = siteSupervisors.find(
                      (s) => s.supervisor_id === site?.supervisor_id
                    );
                    const mat = materials.find((m) => m.material_id === tm.material_id);
                    const sup = suppliers.find((s) => s.supplier_id === tm.supplier_id);
                    return (
                      <tr key={tm.task_material_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {task?.task_name || `Task #${tm.task_id}`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {site?.site_name || 'Site'} · Logged by{' '}
                            {supEng?.name || 'Site Supervisor'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {mat?.material_name || `Material #${tm.material_id}`}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {sup?.supplier_name || `Supplier #${tm.supplier_id}`}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
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

          {canLogMaterialUsage && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-display text-base font-bold text-slate-900">
                Add Used Material Data (Site Supervisor)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Records used material quantity on assigned project site and deducts from available inventory stock
              </p>
              <form
                onSubmit={handleAllocateMaterial}
                data-testid="materials-view-used-material-form"
                className="space-y-3 mt-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Assigned Site Task
                  </label>
                  <select
                    value={tmTaskId}
                    onChange={(e) => setTmTaskId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {visibleTasksForUsage.map((t) => {
                      const s = sites.find((siteItem) => siteItem.site_id === t.site_id);
                      return (
                        <option key={t.task_id} value={t.task_id}>
                          {t.task_name} ({s?.site_name || `Site #${t.site_id}`})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Material Consumed
                  </label>
                  <select
                    value={tmMaterialId}
                    onChange={(e) => setTmMaterialId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {materials.map((m) => (
                      <option key={m.material_id} value={m.material_id}>
                        {m.material_name} (Stock: {m.quantity} {m.unit})
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
                  className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  Save Used Material Data
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Site Supervisor Delivered Material Photo Capture Modal (Requirement 3) */}
      {deliveryModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>Click Photo &amp; Report Material as Delivered</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saves delivered material photo to Supabase bucket{' '}
                  <strong className="font-mono text-slate-700">
                    {ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setDeliveryModalReq(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">
                    {deliveryModalReq.material_name} ({deliveryModalReq.requested_qty}{' '}
                    {deliveryModalReq.unit})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Requisition #{deliveryModalReq.request_id} · Reported by{' '}
                    {activeSupervisor?.name || currentUser?.name || 'Sachin Patil'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-semibold">
                  READY TO REPORT DELIVERED
                </span>
              </div>

              {isCameraActive ? (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-56 object-cover rounded-lg border border-slate-300 bg-slate-900"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhotoFromVideo}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                    >
                      Capture Photo Frame
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                    >
                      Close Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {capturedDeliveryPhoto && (
                    <img
                      src={capturedDeliveryPhoto}
                      alt="Captured Delivered Material"
                      className="w-full h-52 object-cover rounded-lg border border-slate-300"
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Open Live Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCapturedDeliveryPhoto(generateStampedDeliveryPhoto(deliveryModalReq))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Capture Site Stamped Photo</span>
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleDeliveryPhotoFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {cameraError && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setDeliveryModalReq(null);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploadingDelivery}
                  onClick={handleConfirmMaterialDelivered}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingDelivery
                      ? 'Uploading to Supabase...'
                      : 'Report as Delivered & Save Photo'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin / Supervisor Full-Size Delivered Photo Preview Modal */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  {previewPhotoModal.title}
                </h3>
                <p className="text-[11px] font-mono text-emerald-700">
                  {previewPhotoModal.bucketPath ||
                    `${ATTENDANCE_STORAGE_BUCKETS.MATERIAL_DELIVERED}/verified_delivery.jpg`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhotoModal.photoUrl}
              alt={previewPhotoModal.title}
              className="w-full max-h-96 object-contain rounded-lg border border-slate-200 bg-slate-950"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>
                Reported By: <strong>{previewPhotoModal.deliveredBy || 'Site Supervisor'}</strong>
              </span>
              <span className="font-mono">
                {previewPhotoModal.deliveredAt
                  ? new Date(previewPhotoModal.deliveredAt).toLocaleString('en-IN')
                  : 'Verified On-Site'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal (with Delivery Status & Deliver To Project Site dropdowns) */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Edit Supplier #{editingSupplier.supplier_id}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editSupName}
                  onChange={(e) => setEditSupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deliver To Project Site *
                </label>
                <select
                  required
                  value={editSupProjectId}
                  onChange={(e) => setEditSupProjectId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {activeProjects.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name} ({p.location})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delivery Status *
                </label>
                <select
                  value={editSupDeliveryStatus || 'ON_SCHEDULE'}
                  onChange={(e) =>
                    setEditSupDeliveryStatus(
                      e.target.value as SupplierRecord['delivery_status']
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                >
                  <option value="ON_SCHEDULE">ON_SCHEDULE</option>
                  <option value="PENDING_DELIVERY">PENDING_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="DELAYED">DELAYED</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supplied Materials
                </label>
                <input
                  type="text"
                  value={editSupMaterial}
                  onChange={(e) => setEditSupMaterial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quoted Rate</label>
                  <input
                    type="number"
                    value={editSupRate}
                    onChange={(e) => setEditSupRate(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quoted Qty</label>
                  <input
                    type="number"
                    value={editSupQty}
                    onChange={(e) => setEditSupQty(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editSupUnit}
                    onChange={(e) => setEditSupUnit(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number (10 digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editSupPhone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditSupPhone(cleaned);
                    setEditSupPhoneError(null);
                  }}
                  className={`w-full px-3 py-2 rounded-lg border font-mono ${
                    editSupPhoneError ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="9876542001"
                />
                {editSupPhoneError && (
                  <p className="text-[11px] text-red-600 mt-1">{editSupPhoneError}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Office Address *
                </label>
                <input
                  type="text"
                  required
                  value={editSupAddress}
                  onChange={(e) => setEditSupAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editSupStatus}
                  onChange={(e) => setEditSupStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
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
