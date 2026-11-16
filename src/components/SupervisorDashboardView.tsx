import React, { useState, useRef } from 'react';
import {
  Building2,
  Users,
  CalendarCheck,
  CheckSquare,
  Package,
  AlertTriangle,
  Plus,
  Camera,
  MapPin,
  ShieldCheck,
  CloudUpload,
  Layers,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { AttendanceStatus, TaskStatus } from '../types';
import {
  ATTENDANCE_STORAGE_BUCKETS,
  resolveSiteGeofenceConfig,
  verifyCoordinatesAgainstSiteGeofence,
} from '../utils/workforceLogic';

export const SupervisorDashboardView: React.FC = () => {
  const {
    currentUser,
    currentRole,
    sites,
    projects,
    siteSupervisors,
    labours,
    employees,
    labourAssignments,
    empAssignments,
    attendance,
    tasks,
    materials,
    suppliers,
    taskMaterials,
    materialRequests,
    recordAttendance,
    uploadAttendanceSelfie,
    updateTask,
    submitMaterialRequest,
    allocateTaskMaterial,
  } = useWorkforce();

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-22');

  // Match active supervisor from Supabase data by user_id, email/work_email, or name
  const matchedSupervisor =
    siteSupervisors.find(
      (s) =>
        (currentUser?.user_id &&
          String(s.user_id || s.employee_code || '').toLowerCase() ===
            currentUser.user_id.toLowerCase()) ||
        (currentUser?.email &&
          (s.email || s.work_email || '').toLowerCase() ===
            currentUser.email.toLowerCase()) ||
        (currentUser?.name && s.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || siteSupervisors[0];

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number>(
    matchedSupervisor?.supervisor_id || 1
  );

  const activeSupervisor =
    currentRole === 'Site Supervisor' && matchedSupervisor
      ? matchedSupervisor
      : siteSupervisors.find((s) => s.supervisor_id === selectedSupervisorId) ||
        siteSupervisors[0];

  const assignedSites = sites.filter(
    (s) => s.supervisor_id === activeSupervisor?.supervisor_id
  );
  const currentSite = assignedSites[0] || sites[0];
  const currentProject = projects.find((p) => p.project_id === currentSite?.project_id);
  const geofenceConfig = resolveSiteGeofenceConfig(currentSite);

  const siteProjectLabourIds = new Set(
    labourAssignments
      .filter((la) => la.project_id === currentSite?.project_id && la.status === 'ACTIVE')
      .map((la) => la.labour_id)
  );
  const siteLabours = labours.filter(
    (l) =>
      siteProjectLabourIds.has(l.labour_id) ||
      Number(l.assigned_site_id || l.site_id) === currentSite?.site_id
  );

  const siteProjectEmpIds = new Set(
    empAssignments
      .filter((ea) => ea.project_id === currentSite?.project_id && ea.status === 'ACTIVE')
      .map((ea) => ea.employee_id)
  );
  const siteEmployees = employees.filter((e) => siteProjectEmpIds.has(e.employee_id));

  const siteTasks = tasks.filter((t) => t.site_id === currentSite?.site_id);
  const siteMaterialRequests = materialRequests.filter(
    (mr) => mr.site_id === currentSite?.site_id
  );
  const siteUsedMaterials = taskMaterials.filter(
    (tm) =>
      tm.site_id === currentSite?.site_id ||
      siteTasks.some((t) => t.task_id === tm.task_id)
  );

  // --- 1. Site Supervisor Photo + GPS Location for Labour Attendance (Saved in "Labour attendance Image" bucket) ---
  const [photoLabourId, setPhotoLabourId] = useState<number>(
    siteLabours[0]?.labour_id || labours[0]?.labour_id || 101
  );
  const [photoStatus, setPhotoStatus] = useState<AttendanceStatus>('PRESENT');
  const [photoHours, setPhotoHours] = useState<number>(8.5);
  const [photoOvertime, setPhotoOvertime] = useState<number>(0.5);
  const [labourPhotoPreview, setLabourPhotoPreview] = useState<string>('');
  const [labourPhotoFile, setLabourPhotoFile] = useState<File | null>(null);
  const [supLat, setSupLat] = useState<number>(geofenceConfig.centerLat);
  const [supLng, setSupLng] = useState<number>(geofenceConfig.centerLng);
  const [supLocationLabel, setSupLocationLabel] = useState<string>(
    `${geofenceConfig.centerLat.toFixed(4)}° N, ${geofenceConfig.centerLng.toFixed(4)}° E — ${geofenceConfig.siteName} (${geofenceConfig.location})`
  );
  const [isSavingLabourPhoto, setIsSavingLabourPhoto] = useState<boolean>(false);
  const [lastSavedBucketPath, setLastSavedBucketPath] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [supAccuracyMeters, setSupAccuracyMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const geofenceCheck = verifyCoordinatesAgainstSiteGeofence({
    userLat: supLat,
    userLng: supLng,
    site: currentSite,
  });

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleStartCamera = async () => {
    setCameraError(null);
    setPhotoError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      }).catch(() => {
        return navigator.mediaDevices.getUserMedia({ video: true });
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err: any) {
      console.warn('Camera permission denied or error:', err);
      setCameraError(
        'Camera permission denied. Please allow camera access in your browser to capture worker photograph.'
      );
    }
  };

  const handleCaptureFromVideo = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        // Stamp metadata onto photo
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 400, 640, 80);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Labourer: #${photoLabourId} | Date: ${selectedDate}`, 16, 425);
        ctx.font = '12px monospace';
        ctx.fillStyle = '#34D399';
        ctx.fillText(`GPS: ${supLat.toFixed(5)}° N, ${supLng.toFixed(5)}° E (±${supAccuracyMeters ?? 10}m)`, 16, 448);
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`Site: ${currentSite?.site_name || 'Construction Site'} | ${new Date().toLocaleTimeString()}`, 16, 468);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setLabourPhotoPreview(dataUrl);
        setLabourPhotoFile(null);
        setPhotoError(null);
      }
    }
    stopCameraStream();
  };

  const handleRetakePhoto = () => {
    setLabourPhotoPreview('');
    setLabourPhotoFile(null);
    handleStartCamera();
  };

  const generateSupervisorLabourPhotoDataUrl = (labourName: string, siteName: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 480, 320);
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(16, 16, 448, 288);
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('BUILDMATE — SITE SUPERVISOR LABOUR ATTENDANCE PHOTO', 28, 48);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`Bucket: ${ATTENDANCE_STORAGE_BUCKETS.LABOUR}`, 28, 78);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`Labourer: ${labourName} (#${photoLabourId})`, 28, 118);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(`Clicked By: ${activeSupervisor?.name} (${activeSupervisor?.user_id || 'SUP001'})`, 28, 148);
      ctx.fillText(`Site: ${siteName}`, 28, 176);
      ctx.fillStyle = '#34D399';
      ctx.font = '12px monospace';
      ctx.fillText(
        `GPS: ${supLat.toFixed(4)}° N, ${supLng.toFixed(4)}° E (${geofenceCheck.distanceMeters}m from center)`,
        28,
        210
      );
      ctx.fillText(`Date: ${selectedDate} | Status: ${photoStatus} (${photoHours}h)`, 28, 238);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`Timestamp: ${new Date().toISOString()}`, 28, 272);
    }
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  const handleCaptureSupervisorCameraPhoto = () => {
    handleStartCamera();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabourPhotoFile(file);
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLabourPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDetectExactGps = () => {
    setGpsError(null);
    setIsDetectingGps(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          const accuracy = Math.round(pos.coords.accuracy);
          setSupLat(lat);
          setSupLng(lng);
          setSupAccuracyMeters(accuracy);
          setSupLocationLabel(`${lat}° N, ${lng}° E (Accuracy: ±${accuracy}m)`);
          setIsDetectingGps(false);
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setIsDetectingGps(false);
          setGpsError('Location access was denied or GPS is unavailable. Please enable location.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsDetectingGps(false);
      setGpsError('Geolocation is not supported by your browser.');
    }
  };

  const handleUseSiteGps = () => {
    setSupLat(geofenceConfig.centerLat);
    setSupLng(geofenceConfig.centerLng);
    setSupAccuracyMeters(10);
    setSupLocationLabel(
      `${geofenceConfig.centerLat.toFixed(4)}° N, ${geofenceConfig.centerLng.toFixed(4)}° E — ${geofenceConfig.siteName} (${geofenceConfig.location})`
    );
  };

  const handleSaveSupervisorLabourPhotoAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSite || !geofenceCheck.isWithinBoundary) return;

    if (!labourPhotoPreview && !labourPhotoFile) {
      setPhotoError('Attendance photograph is required. Please click or upload worker photograph before submitting.');
      return;
    }

    const photoPayload = labourPhotoFile || labourPhotoPreview;

    setIsSavingLabourPhoto(true);
    try {
      const uploadRes = await uploadAttendanceSelfie(
        photoPayload,
        photoLabourId,
        selectedDate,
        'lab',
        ATTENDANCE_STORAGE_BUCKETS.LABOUR
      );
      setLastSavedBucketPath(uploadRes.bucketPath);

      await recordAttendance(
        {
          site_id: currentSite.site_id,
          labour_id: photoLabourId,
          employee_id: null,
          attendance_date: selectedDate,
          status: photoStatus,
          hours_worked: photoStatus === 'PRESENT' ? photoHours : photoStatus === 'HALF_DAY' ? 4.5 : 0,
          overtime_hours: photoStatus === 'PRESENT' ? photoOvertime : 0,
          recorded_by: `${activeSupervisor?.name} (${activeSupervisor?.user_id || 'SUP001'} · Photo + GPS)`,
          selfie_url: uploadRes.selfieUrl,
          selfie_bucket_path: uploadRes.bucketPath,
          location_lat: supLat,
          location_lng: supLng,
          location_address: supLocationLabel,
          geofence_verified: true,
          geofence_distance_m: geofenceCheck.distanceMeters,
          geofence_radius_m: geofenceCheck.allowedRadiusMeters,
          accuracy_meters: supAccuracyMeters ?? 10,
        },
        true
      );
    } finally {
      setIsSavingLabourPhoto(false);
    }
  };

  // --- 2. Used Material Data Added by Site Supervisor ---
  const [usedTaskId, setUsedTaskId] = useState<number>(siteTasks[0]?.task_id || tasks[0]?.task_id || 1);
  const [usedMaterialId, setUsedMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [usedSupplierId, setUsedSupplierId] = useState<number>(suppliers[0]?.supplier_id || 1);
  const [usedQuantity, setUsedQuantity] = useState<number>(15);
  const [usedDate, setUsedDate] = useState<string>(selectedDate);

  const selectedUsedMat =
    materials.find((m) => m.material_id === usedMaterialId) || materials[0];

  const handleRecordUsedMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsedMat || usedQuantity <= 0) return;
    await allocateTaskMaterial({
      task_id: usedTaskId,
      material_id: selectedUsedMat.material_id,
      supplier_id: usedSupplierId,
      site_id: currentSite?.site_id || 1,
      project_id: currentSite?.project_id || 1,
      quantity_used: Number(usedQuantity),
      unit_cost: selectedUsedMat.cost,
      usage_date: usedDate,
    });
  };

  // --- 3. Quick Material Requisition Form State ---
  const [reqMaterialId, setReqMaterialId] = useState<number>(materials[0]?.material_id || 1);
  const [reqQty, setReqQty] = useState<number>(20);
  const [reqRemarks, setReqRemarks] = useState<string>('');

  const handleQuickAttendance = (labour_id: number, status: AttendanceStatus) => {
    if (!currentSite) return;
    const hours = status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0;
    recordAttendance(
      {
        site_id: currentSite.site_id,
        labour_id,
        employee_id: null,
        attendance_date: selectedDate,
        status,
        hours_worked: hours,
        overtime_hours: 0,
        recorded_by: `${activeSupervisor?.name} (${activeSupervisor?.user_id || 'SUP001'})`,
      },
      true
    );
  };

  const handleMaterialRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSite || !activeSupervisor) return;
    const mat = materials.find((m) => m.material_id === reqMaterialId) || materials[0];
    if (!mat) return;

    await submitMaterialRequest({
      material_id: mat.material_id,
      material_name: mat.material_name,
      category: mat.category || 'Construction Material',
      unit: mat.unit,
      requested_qty: Number(reqQty),
      unit_cost: mat.cost,
      estimated_value: Number(reqQty) * mat.cost,
      project_id: currentSite.project_id,
      site_id: currentSite.site_id,
      supervisor_id: activeSupervisor.supervisor_id,
      supplier_id: 1,
      request_date: selectedDate,
      remarks:
        reqRemarks ||
        `Site requisition by ${activeSupervisor.name} (${activeSupervisor.user_id || 'SUP001'})`,
    });
    setReqRemarks('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Supervisor Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-semibold">
              SITE SUPERVISOR HUB
            </span>
            <span className="font-mono text-xs text-slate-500">
              {activeSupervisor?.user_id || activeSupervisor?.employee_code} ·{' '}
              {activeSupervisor?.email} · {activeSupervisor?.phone}
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {currentSite?.site_name} — {activeSupervisor?.name}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Project: <strong className="text-slate-800">{currentProject?.project_name}</strong> ·{' '}
            Location: {currentSite?.location} · Specialization:{' '}
            <strong className="text-slate-800">{activeSupervisor?.specialization}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentRole !== 'Site Supervisor' && (
            <div>
              <label
                htmlFor="sup-select"
                className="block text-[10px] font-semibold uppercase text-slate-400 mb-1"
              >
                Active Site Supervisor (10 in Supabase)
              </label>
              <select
                id="sup-select"
                value={activeSupervisor?.supervisor_id || 1}
                onChange={(e) => setSelectedSupervisorId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800"
              >
                {siteSupervisors.map((sup) => (
                  <option key={sup.supervisor_id} value={sup.supervisor_id}>
                    {sup.user_id || sup.employee_code} — {sup.name} ({sup.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="sup-date"
              className="block text-[10px] font-semibold uppercase text-slate-400 mb-1"
            >
              Roll-Call Date
            </label>
            <input
              id="sup-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Assigned Site Crew</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2">
            {siteLabours.length + siteEmployees.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {siteLabours.length} Labourers · {siteEmployees.length} Engineers
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Site Tasks</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2">
            {siteTasks.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {siteTasks.filter((t) => t.status === 'COMPLETED').length} Completed ·{' '}
            {siteTasks.filter((t) => t.status === 'DELAYED').length} Delayed
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Used Material Entries</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-2">
            {siteUsedMaterials.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Logged by {activeSupervisor?.name}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Labour Photo Bucket</span>
            <Camera className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-mono text-xs font-bold text-emerald-800 mt-2 truncate">
            {ATTENDANCE_STORAGE_BUCKETS.LABOUR}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Supabase Storage + GPS Geofence
          </div>
        </div>
      </div>

      {/* NEW: Site Supervisor Photo + GPS Location for Labour Attendance -> Saved in "Labour attendance Image" Bucket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div
          data-testid="supervisor-labour-photo-attendance-card"
          className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[10px] font-semibold">
                <Camera className="w-3 h-3 text-amber-600" />
                SUPABASE BUCKET: {ATTENDANCE_STORAGE_BUCKETS.LABOUR}
              </span>
              <h2 className="font-display text-base font-bold text-slate-900 mt-1.5">
                Click Photo with Location for Labour Attendance
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Site Supervisor (<strong className="text-slate-800">{activeSupervisor?.name}</strong>) captures labourer photo &amp; GPS coordinates and saves directly to{' '}
                <code className="font-mono text-blue-700 font-semibold">
                  {ATTENDANCE_STORAGE_BUCKETS.LABOUR}
                </code>{' '}
                in Supabase Storage.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupervisorLabourPhotoAttendance} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Site Labourer *
                </label>
                <select
                  data-testid="supervisor-photo-labour-select"
                  value={photoLabourId}
                  onChange={(e) => setPhotoLabourId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {(siteLabours.length > 0 ? siteLabours : labours).map((lab) => (
                    <option key={lab.labour_id} value={lab.labour_id}>
                      {lab.user_id || lab.labour_code || `#${lab.labour_id}`} — {lab.name} ({lab.phone} · {lab.skill})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status *</label>
                <select
                  value={photoStatus}
                  onChange={(e) => setPhotoStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono font-semibold"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={16}
                  value={photoHours}
                  onChange={(e) => setPhotoHours(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Overtime (h)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={8}
                  value={photoOvertime}
                  onChange={(e) => setPhotoOvertime(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GPS Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={supLat}
                  onChange={(e) => setSupLat(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GPS Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={supLng}
                  onChange={(e) => setSupLng(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Errors and alerts */}
            {cameraError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-center justify-between">
                <span>{cameraError}</span>
                <button
                  type="button"
                  onClick={() => setCameraError(null)}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {gpsError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                <span>{gpsError}</span>
                <button
                  type="button"
                  onClick={() => setGpsError(null)}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {photoError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold">
                {photoError}
              </div>
            )}

            {/* Geofence Status Strip with Exact GPS Detection */}
            <div
              className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                geofenceCheck.isWithinBoundary
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-emerald-700" />
                <div>
                  <div className="font-semibold">{geofenceCheck.message}</div>
                  <div className="text-[10px] text-slate-600">
                    Coords: {supLat.toFixed(5)}° N, {supLng.toFixed(5)}° E {supAccuracyMeters ? `(±${supAccuracyMeters}m accuracy)` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDetectExactGps}
                  disabled={isDetectingGps}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isDetectingGps ? 'Detecting GPS...' : 'Detect Exact GPS'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseSiteGps}
                  className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Use Site Center</span>
                </button>
              </div>
            </div>

            {/* Live Camera Viewfinder */}
            {isCameraActive && (
              <div className="space-y-2 p-3 bg-slate-900 rounded-xl text-white">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Live Device Camera</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Stream Active</span>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-56 rounded-lg bg-black object-cover border border-slate-700"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={stopCameraStream}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureFromVideo}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photograph</span>
                  </button>
                </div>
              </div>
            )}

            {/* Photo Capture / Upload Controls */}
            {!isCameraActive && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="supervisor-click-labour-photo-btn"
                  onClick={handleStartCamera}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Click Labour Photo</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload Image File</span>
                </button>

                <button
                  type="submit"
                  data-testid="supervisor-save-labour-photo-attendance-btn"
                  disabled={isSavingLabourPhoto || !geofenceCheck.isWithinBoundary || (!labourPhotoPreview && !labourPhotoFile)}
                  className="ml-auto px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-40 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSavingLabourPhoto
                      ? 'Saving to Bucket...'
                      : `Save to "${ATTENDANCE_STORAGE_BUCKETS.LABOUR}"`}
                  </span>
                </button>
              </div>
            )}

            {/* Captured Photograph Preview with Retake Option */}
            {labourPhotoPreview && !isCameraActive && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={labourPhotoPreview}
                    alt="Supervisor captured labour attendance"
                    className="w-24 h-18 object-cover rounded-md border border-slate-300 shrink-0"
                  />
                  <div className="min-w-0 text-[11px]">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Photograph Captured &amp; Verified</span>
                    </div>
                    <div className="text-slate-600 font-mono text-[10px] mt-0.5">
                      Target Bucket: <strong className="text-blue-700">{ATTENDANCE_STORAGE_BUCKETS.LABOUR}</strong>
                    </div>
                    <div className="text-slate-500 truncate mt-0.5">{supLocationLabel}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetakePhoto}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Retake</span>
                </button>
              </div>
            )}

            {lastSavedBucketPath && (
              <div
                data-testid="supervisor-saved-bucket-banner"
                className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2 text-[11px]"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Saved Labour Photo + Location in Supabase Bucket:{' '}
                  <code className="font-mono font-bold">{lastSavedBucketPath}</code>
                </span>
              </div>
            )}
          </form>
        </div>

        {/* NEW: Used Material Data Added by Site Supervisor */}
        <div
          data-testid="supervisor-used-material-card"
          className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono text-[10px] font-semibold">
                <Layers className="w-3 h-3 text-indigo-600" />
                SITE SUPERVISOR MATERIAL CONSUMPTION
              </span>
              <h2 className="font-display text-base font-bold text-slate-900 mt-1.5">
                Add Used Material Data on Site (Site Supervisor)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record daily used material quantities on{' '}
                <strong className="text-slate-800">{currentSite?.site_name}</strong>. Automatically
                deducts stock in materials inventory and updates site expenditure.
              </p>
            </div>
          </div>

          <form onSubmit={handleRecordUsedMaterial} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Material Used *
                </label>
                <select
                  data-testid="supervisor-used-material-select"
                  value={usedMaterialId}
                  onChange={(e) => setUsedMaterialId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {materials.map((m) => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.material_name} (Stock: {m.quantity} {m.unit} · ₹{m.cost}/{m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Site Task / Work Package *
                </label>
                <select
                  data-testid="supervisor-used-task-select"
                  value={usedTaskId}
                  onChange={(e) => setUsedTaskId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {(siteTasks.length > 0 ? siteTasks : tasks).map((t) => (
                    <option key={t.task_id} value={t.task_id}>
                      #{t.task_id} — {t.task_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Used ({selectedUsedMat?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  data-testid="supervisor-used-qty-input"
                  min={1}
                  step="0.5"
                  required
                  value={usedQuantity}
                  onChange={(e) => setUsedQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
                <select
                  value={usedSupplierId}
                  onChange={(e) => setUsedSupplierId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {suppliers.map((sup) => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>
                      {sup.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Usage Date</label>
                <input
                  type="date"
                  value={usedDate}
                  onChange={(e) => setUsedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span>
                Available Stock:{' '}
                <strong className="font-mono text-slate-900">
                  {selectedUsedMat?.quantity ?? 0} {selectedUsedMat?.unit}
                </strong>{' '}
                → Remaining After Entry:{' '}
                <strong className="font-mono text-indigo-700">
                  {Math.max(0, (selectedUsedMat?.quantity ?? 0) - Number(usedQuantity || 0))}{' '}
                  {selectedUsedMat?.unit}
                </strong>
              </span>
              <span className="font-mono font-bold text-slate-900">
                Value: INR{' '}
                {(Number(usedQuantity || 0) * Number(selectedUsedMat?.cost || 0)).toLocaleString(
                  'en-IN'
                )}
              </span>
            </div>

            <button
              type="submit"
              data-testid="supervisor-add-used-material-btn"
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>
                Record Used Material Data ({usedQuantity} {selectedUsedMat?.unit} of{' '}
                {selectedUsedMat?.material_name})
              </span>
            </button>
          </form>

          {/* Live Used Material Ledger on Site */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 mb-2">
              Recent Used Material Logs on {currentSite?.site_name} ({siteUsedMaterials.length})
            </div>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-[11px]">
              {siteUsedMaterials.map((tm) => {
                const mat = materials.find((m) => m.material_id === tm.material_id);
                const tsk = tasks.find((t) => t.task_id === tm.task_id);
                return (
                  <div
                    key={tm.task_material_id}
                    data-testid="supervisor-used-material-row"
                    className="p-2.5 flex items-center justify-between gap-2 bg-white hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {mat?.material_name || `Material #${tm.material_id}`} —{' '}
                        <span className="font-mono text-indigo-700">
                          {tm.quantity_used} {mat?.unit || 'Units'}
                        </span>
                      </div>
                      <div className="text-slate-500">
                        Task: {tsk?.task_name || `Task #${tm.task_id}`} · Date:{' '}
                        {tm.usage_date || selectedDate}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 shrink-0">
                      INR {Number(tm.total_cost || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Daily Muster Roll Call + Site Tasks & Material Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Assigned Crew & One-Click Roll Call */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Daily Site Muster Roll Call ({selectedDate})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark daily shift status for labourers assigned to {currentSite?.site_name}
              </p>
            </div>
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Worker &amp; Trade</th>
                  <th className="py-3 px-4">Photo Bucket &amp; Wage</th>
                  <th className="py-3 px-4">Logged Status</th>
                  <th className="py-3 px-4 text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {siteLabours.map((lab) => {
                  const log = attendance.find(
                    (a) =>
                      a.site_id === currentSite?.site_id &&
                      a.labour_id === lab.labour_id &&
                      a.attendance_date === selectedDate
                  );
                  return (
                    <tr key={lab.labour_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {lab.name}{' '}
                          <span className="font-mono text-[10px] text-slate-500">
                            ({lab.user_id || lab.labour_code})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{lab.skill}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <div>INR {lab.wage_rate}/day</div>
                        {log?.selfie_bucket_path && (
                          <div className="text-[10px] text-emerald-700 truncate max-w-[170px]">
                            {log.selfie_bucket_path}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                              log.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : log.status === 'HALF_DAY'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : log.status === 'LEAVE'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            {log.status} ({log.hours_worked}h)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">UNMARKED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {(['PRESENT', 'HALF_DAY', 'ABSENT'] as AttendanceStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickAttendance(lab.labour_id, st)}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                                log?.status === st
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {st === 'PRESENT' ? 'P' : st === 'HALF_DAY' ? 'HD' : 'A'}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Cols: Site Tasks Progress & Material Request Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Site Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Site Execution Tasks
                </h2>
                <p className="text-xs text-slate-500">
                  Update task status on {currentSite?.site_name}
                </p>
              </div>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {siteTasks.map((task) => {
                const assignee = labours.find((l) => l.labour_id === task.labour_id);
                const isOverdue = task.status !== 'COMPLETED' && task.end_date < '2026-10-22';
                return (
                  <div
                    key={task.task_id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-semibold text-slate-900">{task.task_name}</div>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-mono shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Assigned: <strong>{assignee?.name || 'Site Crew'}</strong> · Due:{' '}
                      <span className="font-mono">{task.end_date}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono text-slate-500">
                        Priority: {task.priority || 'MEDIUM'}
                      </span>
                      <select
                        aria-label={`Update status for ${task.task_name}`}
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.task_id, { status: e.target.value as TaskStatus })
                        }
                        className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-mono font-semibold text-slate-800"
                      >
                        <option value="NOT_STARTED">NOT_STARTED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="DELAYED">DELAYED</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit Site Material Requisition */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Raise Site Material Requisition
                </h2>
                <p className="text-xs text-slate-500">
                  Request bulk materials for {currentSite?.site_name}
                </p>
              </div>
              <Package className="w-4 h-4 text-amber-600" />
            </div>

            <form onSubmit={handleMaterialRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="req-mat"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Select Material
                </label>
                <select
                  id="req-mat"
                  value={reqMaterialId}
                  onChange={(e) => setReqMaterialId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {materials.map((m) => (
                    <option key={m.material_id} value={m.material_id}>
                      {m.material_name} ({m.unit} · Stock: {m.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="req-qty"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Requested Quantity
                </label>
                <input
                  id="req-qty"
                  type="number"
                  min={1}
                  value={reqQty}
                  onChange={(e) => setReqQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
                />
              </div>

              <div>
                <label
                  htmlFor="req-notes"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Site Usage Remarks
                </label>
                <input
                  id="req-notes"
                  type="text"
                  placeholder="e.g., Needed for 14th floor slab concreting"
                  value={reqRemarks}
                  onChange={(e) => setReqRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Material Request ({siteMaterialRequests.length} Active)</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
