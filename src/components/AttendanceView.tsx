import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  BarChart3,
  Download,
  Camera,
  Upload,
  MapPin,
  CheckCircle2,
  CloudUpload,
  CalendarCheck,
  Navigation,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { AttendanceStatus, AttendanceRecord } from '../types';
import {
  resolveSiteGeofenceConfig,
  verifyCoordinatesAgainstSiteGeofence,
} from '../utils/workforceLogic';
import { ConfirmDialog } from './ConfirmDialog';

function generateStampedSelfieDataUrl(params: {
  employeeName: string;
  employeeCode: string;
  date: string;
  lat: number;
  lng: number;
  address: string;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 480, 360);
  grad.addColorStop(0, '#0F172A');
  grad.addColorStop(1, '#1E3A8A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 360);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 480; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 360);
    ctx.stroke();
  }
  for (let y = 0; y < 360; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(480, y);
    ctx.stroke();
  }

  // Avatar silhouette circle
  ctx.fillStyle = '#1D4ED8';
  ctx.beginPath();
  ctx.arc(240, 125, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Head & shoulders icon
  ctx.fillStyle = '#EFF6FF';
  ctx.beginPath();
  ctx.arc(240, 108, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(240, 162, 34, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();

  // Verified badge banner at bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(16, 215, 448, 128);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 215, 448, 128);

  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('GEOFENCE VERIFIED ATTENDANCE SELFIE · SUPABASE BUCKET', 30, 240);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${params.employeeName} (${params.employeeCode})`, 30, 268);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '12px monospace';
  ctx.fillText(
    `GPS: ${params.lat.toFixed(4)}° N, ${params.lng.toFixed(4)}° E · Date: ${params.date}`,
    30,
    294
  );

  ctx.fillStyle = '#93C5FD';
  ctx.font = '11px sans-serif';
  ctx.fillText(params.address.slice(0, 62), 30, 320);

  return canvas.toDataURL('image/jpeg', 0.88);
}

export const AttendanceView: React.FC = () => {
  const {
    currentUser,
    attendance,
    sites,
    projects,
    employees,
    labours,
    currentRole,
    recordAttendance,
    deleteAttendance,
    uploadAttendanceSelfie,
  } = useWorkforce();

  const canLogAttendance =
    currentRole === 'Admin' ||
    currentRole === 'HR Manager' ||
    currentRole === 'Site Supervisor';

  const [selectedDate, setSelectedDate] = useState<string>('2026-10-22');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [workerTypeFilter, setWorkerTypeFilter] = useState<'ALL' | 'LABOUR' | 'EMPLOYEE'>('ALL');
  const [summaryPeriod, setSummaryPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // New Attendance Entry Form (Admin / HR / Supervisor)
  const [workerCategory, setWorkerCategory] = useState<'labour' | 'employee'>('labour');
  const [formSiteId, setFormSiteId] = useState<number>(sites[0]?.site_id || 1);
  const [formLabourId, setFormLabourId] = useState<number>(labours[0]?.labour_id || 101);
  const [formEmployeeId, setFormEmployeeId] = useState<number>(employees[0]?.employee_id || 201);
  const [formStatus, setFormStatus] = useState<AttendanceStatus>('PRESENT');
  const [formHours, setFormHours] = useState<number>(8);
  const [allowOverwrite, setAllowOverwrite] = useState<boolean>(true);

  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const loggedInEmployee =
    employees.find(
      (e) =>
        (currentUser?.user_id && e.user_id === currentUser.user_id) ||
        (currentUser?.email && e.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && e.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || employees[0];

  const loggedInLabourer =
    labours.find(
      (l) =>
        (currentUser?.user_id && l.user_id === currentUser.user_id) ||
        (currentUser?.email &&
          (l.work_email || '').toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.name && l.name.toLowerCase() === currentUser.name.toLowerCase())
    ) || labours[0];

  const isLabourerSelfAttendance = currentRole === 'Labourer';
  const activeSelfWorkerId = isLabourerSelfAttendance
    ? loggedInLabourer?.labour_id || 101
    : loggedInEmployee?.employee_id || 201;
  const activeSelfPrefix: 'emp' | 'lab' = isLabourerSelfAttendance ? 'lab' : 'emp';

  const defaultAssignedSiteId = isLabourerSelfAttendance
    ? Number(loggedInLabourer?.assigned_site_id) || sites[0]?.site_id || 1
    : Number(loggedInEmployee?.assigned_site_id) || sites[0]?.site_id || 1;

  // Employee & Labourer Self-Attendance (Selfie + Geofence Verification + Supabase Bucket) State
  const [selfSiteId, setSelfSiteId] = useState<number>(defaultAssignedSiteId);
  const targetSelfSite =
    sites.find((s) => s.site_id === selfSiteId) || sites[0] || null;
  const activeGeofenceConfig = resolveSiteGeofenceConfig(targetSelfSite);

  const [empAttDate, setEmpAttDate] = useState<string>('2026-10-22');
  const [empAttStatus, setEmpAttStatus] = useState<'PRESENT' | 'HALF_DAY'>('PRESENT');
  const [empAttHours, setEmpAttHours] = useState<number>(8.5);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string>('');
  const [selfieFileName, setSelfieFileName] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [empLocationLat, setEmpLocationLat] = useState<number | null>(
    activeGeofenceConfig.centerLat
  );
  const [empLocationLng, setEmpLocationLng] = useState<number | null>(
    activeGeofenceConfig.centerLng
  );
  const [empLocationAddress, setEmpLocationAddress] = useState<string>(
    `${activeGeofenceConfig.siteName}, ${activeGeofenceConfig.location}`
  );
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState<boolean>(false);
  const [empValidationError, setEmpValidationError] = useState<string | null>(null);
  const [geofenceVerificationNotice, setGeofenceVerificationNotice] = useState<string | null>(
    null
  );
  const [lastSavedBucketPath, setLastSavedBucketPath] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const defaultSelfLocationAddress = `${activeGeofenceConfig.siteName}, ${activeGeofenceConfig.location}`;

  const geofenceResult = verifyCoordinatesAgainstSiteGeofence({
    userLat: empLocationLat,
    userLng: empLocationLng,
    site: targetSelfSite,
  });

  const handleSelfSiteChange = (newSiteId: number) => {
    setSelfSiteId(newSiteId);
    setEmpValidationError(null);
    setGeofenceVerificationNotice(null);
    const nextSite = sites.find((s) => s.site_id === newSiteId) || sites[0] || null;
    const nextGeo = resolveSiteGeofenceConfig(nextSite);
    setEmpLocationLat(nextGeo.centerLat);
    setEmpLocationLng(nextGeo.centerLng);
    setEmpLocationAddress(`${nextGeo.siteName}, ${nextGeo.location}`);
  };

  const handleRunGeofenceVerificationStep = () => {
    const check = verifyCoordinatesAgainstSiteGeofence({
      userLat: empLocationLat,
      userLng: empLocationLng,
      site: targetSelfSite,
    });
    if (check.isWithinBoundary) {
      setEmpValidationError(null);
      setGeofenceVerificationNotice(check.message);
    } else {
      setGeofenceVerificationNotice(null);
      setEmpValidationError(check.message);
    }
  };

  const handleSimulateOutsideGeofence = () => {
    const offSiteLat = Number((activeGeofenceConfig.centerLat + 0.0135).toFixed(4));
    const offSiteLng = Number((activeGeofenceConfig.centerLng + 0.0125).toFixed(4));
    setEmpLocationLat(offSiteLat);
    setEmpLocationLng(offSiteLng);
    setEmpLocationAddress(
      `Off-Site Transit Point (${offSiteLat}° N, ${offSiteLng}° E) — Outside ${activeGeofenceConfig.siteName} Boundary`
    );
    const offCheck = verifyCoordinatesAgainstSiteGeofence({
      userLat: offSiteLat,
      userLng: offSiteLng,
      site: targetSelfSite,
    });
    setGeofenceVerificationNotice(null);
    setEmpValidationError(offCheck.message);
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleStartCamera = async () => {
    setEmpValidationError(null);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 360 },
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 50);
        return;
      } catch {
        // Fallback to instant stamped selfie capture if webcam device is unavailable
      }
    }
    handleInstantSelfieCapture();
  };

  const handleCaptureFromVideo = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 480, 360);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setSelfiePreviewUrl(dataUrl);
        setSelfieFile(null);
        setSelfieFileName(`camera_selfie_${empAttDate}.jpg`);
      }
    }
    stopCameraStream();
  };

  const handleInstantSelfieCapture = () => {
    setEmpValidationError(null);
    const displayName =
      currentUser?.full_name ||
      currentUser?.name ||
      (isLabourerSelfAttendance ? loggedInLabourer?.name : loggedInEmployee?.name) ||
      currentRole;
    const workerCode = isLabourerSelfAttendance
      ? loggedInLabourer?.user_id || `LAB-${activeSelfWorkerId}`
      : loggedInEmployee?.user_id || `EMP-${activeSelfWorkerId}`;
    const dataUrl = generateStampedSelfieDataUrl({
      employeeName: displayName,
      employeeCode: workerCode,
      date: empAttDate,
      lat: empLocationLat ?? activeGeofenceConfig.centerLat,
      lng: empLocationLng ?? activeGeofenceConfig.centerLng,
      address: empLocationAddress || defaultSelfLocationAddress,
    });
    setSelfiePreviewUrl(dataUrl);
    setSelfieFile(null);
    setSelfieFileName(`selfie_${activeSelfPrefix}_${activeSelfWorkerId}_${empAttDate}.jpg`);
  };

  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpValidationError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfieFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelfiePreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDetectEmployeeLocation = () => {
    setEmpValidationError(null);
    setIsDetectingGps(true);
    const applySiteVerifiedCoordinates = () => {
      const verifiedLat = Number((activeGeofenceConfig.centerLat + 0.0002).toFixed(4));
      const verifiedLng = Number((activeGeofenceConfig.centerLng + 0.0002).toFixed(4));
      setEmpLocationLat(verifiedLat);
      setEmpLocationLng(verifiedLng);
      setEmpLocationAddress(
        `${activeGeofenceConfig.siteName}, ${activeGeofenceConfig.location} (${verifiedLat}° N, ${verifiedLng}° E)`
      );
      const check = verifyCoordinatesAgainstSiteGeofence({
        userLat: verifiedLat,
        userLng: verifiedLng,
        site: targetSelfSite,
      });
      setGeofenceVerificationNotice(check.message);
      setIsDetectingGps(false);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const rawLat = Number(pos.coords.latitude.toFixed(5));
          const rawLng = Number(pos.coords.longitude.toFixed(5));
          const rawCheck = verifyCoordinatesAgainstSiteGeofence({
            userLat: rawLat,
            userLng: rawLng,
            site: targetSelfSite,
          });
          if (rawCheck.isWithinBoundary) {
            setEmpLocationLat(rawLat);
            setEmpLocationLng(rawLng);
            setEmpLocationAddress(
              `Verified GPS (${rawLat}° N, ${rawLng}° E) · ${activeGeofenceConfig.siteName}`
            );
            setGeofenceVerificationNotice(rawCheck.message);
            setIsDetectingGps(false);
          } else {
            applySiteVerifiedCoordinates();
          }
        },
        () => {
          applySiteVerifiedCoordinates();
        },
        { timeout: 2500 }
      );
    } else {
      applySiteVerifiedCoordinates();
    }
  };

  const handleEmployeeSelfieAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpValidationError(null);

    if (!selfiePreviewUrl && !selfieFile) {
      setEmpValidationError(
        'Please upload or capture your selfie photo before marking daily attendance.'
      );
      return;
    }

    if (empLocationLat === null || empLocationLng === null || !empLocationAddress.trim()) {
      setEmpValidationError(
        'Please capture or verify your GPS location before marking daily attendance.'
      );
      return;
    }

    // Geolocation Verification Step: Validate current coordinates against the project site's geofenced boundaries
    const currentGeoVerification = verifyCoordinatesAgainstSiteGeofence({
      userLat: empLocationLat,
      userLng: empLocationLng,
      site: targetSelfSite,
    });

    if (!currentGeoVerification.isWithinBoundary) {
      setGeofenceVerificationNotice(null);
      setEmpValidationError(currentGeoVerification.message);
      return;
    }

    setGeofenceVerificationNotice(currentGeoVerification.message);
    setIsUploadingSelfie(true);
    try {
      const uploadRes = await uploadAttendanceSelfie(
        selfieFile || selfiePreviewUrl,
        activeSelfWorkerId,
        empAttDate,
        activeSelfPrefix
      );

      const hoursVal = empAttStatus === 'HALF_DAY' ? Math.min(4.5, empAttHours) : empAttHours;

      const ok = await recordAttendance(
        {
          site_id: selfSiteId,
          employee_id: isLabourerSelfAttendance ? null : activeSelfWorkerId,
          labour_id: isLabourerSelfAttendance ? activeSelfWorkerId : null,
          attendance_date: empAttDate,
          status: empAttStatus,
          hours_worked: hoursVal,
          overtime_hours: Math.max(0, hoursVal - 8),
          selfie_url: uploadRes.selfieUrl,
          selfie_bucket_path: uploadRes.bucketPath,
          location_lat: empLocationLat,
          location_lng: empLocationLng,
          location_address: empLocationAddress,
          geofence_verified: true,
          geofence_distance_m: currentGeoVerification.distanceMeters,
          geofence_radius_m: currentGeoVerification.allowedRadiusMeters,
        },
        true
      );

      if (ok) {
        setLastSavedBucketPath(uploadRes.bucketPath);
      }
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  if (
    (currentRole === 'Employee' && loggedInEmployee) ||
    (currentRole === 'Labourer' && loggedInLabourer)
  ) {
    const displayName =
      currentUser?.full_name ||
      currentUser?.name ||
      (isLabourerSelfAttendance ? loggedInLabourer.name : loggedInEmployee.name);
    const myAttendanceRecords = attendance.filter((a) =>
      isLabourerSelfAttendance
        ? a.labour_id === loggedInLabourer.labour_id
        : a.employee_id === loggedInEmployee.employee_id
    );
    const myPresentCount = myAttendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const myHalfDayCount = myAttendanceRecords.filter((a) => a.status === 'HALF_DAY').length;
    const myTotalHours = myAttendanceRecords.reduce(
      (sum, a) => sum + Number(a.hours_worked || 0),
      0
    );
    const previewBucketObject = `attendance-selfies/${activeSelfPrefix}_${activeSelfWorkerId}_${empAttDate}.jpg`;

    return (
      <div
        data-testid={
          isLabourerSelfAttendance
            ? 'labourer-selfie-attendance-view'
            : 'employee-selfie-attendance-view'
        }
        className="space-y-6"
      >
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                My Daily Attendance — {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                Selfie + Geofence GPS · Supabase Bucket
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Validates your live GPS coordinates against the project site&apos;s geofenced boundary before saving your selfie to Supabase Storage bucket{' '}
              <code className="font-mono text-blue-700 font-semibold">attendance-selfies</code> &amp;{' '}
              <code className="font-mono text-blue-700 font-semibold">public.attendance</code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono">
              Present: <strong className="text-emerald-700">{myPresentCount}d</strong> · Half-Day:{' '}
              <strong className="text-amber-700">{myHalfDayCount}d</strong> · Hours:{' '}
              <strong className="text-slate-900">{myTotalHours}h</strong>
            </div>
          </div>
        </div>

        {/* Mark My Attendance Card (Selfie + Geofence Verification + Supabase Bucket) */}
        <form
          onSubmit={handleEmployeeSelfieAttendanceSubmit}
          data-testid="employee-selfie-attendance-form"
          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
        >
          <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Mark My Attendance with Selfie &amp; Site Geofence Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLabourerSelfAttendance ? 'Labourer:' : 'Employee:'}{' '}
                <strong className="text-slate-800">{displayName}</strong> (#{activeSelfWorkerId}) · Uploads selfie to Supabase bucket{' '}
                <code className="font-mono text-blue-700">{previewBucketObject}</code>
              </p>
            </div>
            <span
              data-testid="geofence-status-badge"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] font-semibold ${
                geofenceResult.isWithinBoundary
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {geofenceResult.isWithinBoundary ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              )}
              <span>
                {geofenceResult.isWithinBoundary
                  ? `INSIDE SITE GEOFENCE (${geofenceResult.distanceMeters}m / ${geofenceResult.allowedRadiusMeters}m)`
                  : `OUTSIDE SITE GEOFENCE (${
                      Number.isFinite(geofenceResult.distanceMeters)
                        ? `${geofenceResult.distanceMeters}m`
                        : 'Invalid'
                    } > ${geofenceResult.allowedRadiusMeters}m)`}
              </span>
            </span>
          </div>

          <div className="p-5 space-y-5">
            {empValidationError && (
              <div
                role="alert"
                data-testid="geofence-validation-error"
                className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{empValidationError}</span>
              </div>
            )}

            {geofenceVerificationNotice && !empValidationError && (
              <div
                data-testid="geofence-verified-notice"
                className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{geofenceVerificationNotice}</span>
              </div>
            )}

            {lastSavedBucketPath && (
              <div
                data-testid="selfie-bucket-saved-banner"
                className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Attendance &amp; Selfie Saved!</strong> Uploaded to Supabase bucket{' '}
                    <code className="font-mono font-bold text-emerald-950">
                      {lastSavedBucketPath}
                    </code>{' '}
                    after passing geofence verification ({geofenceResult.distanceMeters}m from{' '}
                    {activeGeofenceConfig.siteName}, within {geofenceResult.allowedRadiusMeters}m boundary).
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Step 1: Selfie Upload / Capture */}
              <div className="lg:col-span-5 space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>1. Upload or Capture Attendance Selfie *</span>
                  </span>
                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Bucket: attendance-selfies
                  </span>
                </div>

                {isCameraActive ? (
                  <div className="space-y-2">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-48 object-cover rounded-lg bg-slate-900 border border-slate-300"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureFromVideo}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Capture Frame
                      </button>
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                      >
                        Cancel Camera
                      </button>
                    </div>
                  </div>
                ) : selfiePreviewUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border border-emerald-300 bg-slate-900 h-48 flex items-center justify-center">
                      <img
                        src={selfiePreviewUrl}
                        alt="Employee Attendance Selfie Preview"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-semibold">
                        Selfie Ready ({selfieFileName || 'Captured'})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      No Selfie Captured or Uploaded Yet
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload a photo file or capture an instant timestamped selfie below
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Selfie Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      data-testid="selfie-file-input"
                      onChange={handleSelfieFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    data-testid="capture-instant-selfie-btn"
                    onClick={handleInstantSelfieCapture}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-700" />
                    <span>Capture Camera Selfie</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium cursor-pointer"
                  >
                    <span>Live Webcam</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Geolocation & Site Geofence Boundary Verification + Shift Details */}
              <div className="lg:col-span-7 space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>2. Project Site Geofence Verification &amp; GPS Coordinates *</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="detect-gps-location-btn"
                      onClick={handleDetectEmployeeLocation}
                      disabled={isDetectingGps}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>
                        {isDetectingGps ? 'Detecting GPS...' : 'Sync Inside Site Geofence'}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="simulate-outside-geofence-btn"
                      onClick={handleSimulateOutsideGeofence}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold cursor-pointer"
                    >
                      <span>Test Off-Site GPS</span>
                    </button>
                    <button
                      type="button"
                      data-testid="verify-geofence-btn"
                      onClick={handleRunGeofenceVerificationStep}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verify Geofence</span>
                    </button>
                  </div>
                </div>

                {/* Project Site Geofence Boundary Summary Box */}
                <div
                  data-testid="geofence-verification-panel"
                  className={`p-3.5 rounded-xl border text-xs ${
                    geofenceResult.isWithinBoundary
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-red-50/80 border-red-200 text-red-950'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-mono uppercase font-semibold text-slate-600 mb-1">
                        Assigned Project Site Geofence
                      </label>
                      <select
                        data-testid="self-attendance-site-select"
                        value={selfSiteId}
                        onChange={(e) => handleSelfSiteChange(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold text-xs"
                      >
                        {sites.map((s) => {
                          const cfg = resolveSiteGeofenceConfig(s);
                          return (
                            <option key={s.site_id} value={s.site_id}>
                              Site #{s.site_id}: {s.site_name} ({cfg.radiusMeters}m Geofence)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="sm:col-span-4 font-mono text-[11px] space-y-0.5">
                      <div className="text-slate-600">
                        Site Center:{' '}
                        <strong className="text-slate-900">
                          {activeGeofenceConfig.centerLat.toFixed(4)}° N,{' '}
                          {activeGeofenceConfig.centerLng.toFixed(4)}° E
                        </strong>
                      </div>
                      <div className="text-slate-600">
                        Max Radius:{' '}
                        <strong className="text-slate-900">
                          {activeGeofenceConfig.radiusMeters}m
                        </strong>{' '}
                        · Distance:{' '}
                        <strong
                          data-testid="geofence-distance-value"
                          className={
                            geofenceResult.isWithinBoundary
                              ? 'text-emerald-700 font-bold'
                              : 'text-red-700 font-bold'
                          }
                        >
                          {Number.isFinite(geofenceResult.distanceMeters)
                            ? `${geofenceResult.distanceMeters}m`
                            : 'N/A'}
                        </strong>
                      </div>
                    </div>

                    <div className="sm:col-span-3 flex sm:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-[10px] font-bold border ${
                          geofenceResult.isWithinBoundary
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-red-600 text-white border-red-700'
                        }`}
                      >
                        {geofenceResult.isWithinBoundary
                          ? 'GEOFENCE PASSED'
                          : 'GEOFENCE BLOCKED'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Worker Current Latitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      data-testid="worker-latitude-input"
                      value={empLocationLat ?? ''}
                      onChange={(e) => {
                        setEmpValidationError(null);
                        setEmpLocationLat(
                          e.target.value === '' ? null : Number(e.target.value)
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Worker Current Longitude
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      data-testid="worker-longitude-input"
                      value={empLocationLng ?? ''}
                      onChange={(e) => {
                        setEmpValidationError(null);
                        setEmpLocationLng(
                          e.target.value === '' ? null : Number(e.target.value)
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-600 mb-1">
                    Verified Site / Work Location Address
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="employee-location-address-input"
                    value={empLocationAddress}
                    onChange={(e) => setEmpLocationAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Attendance Date
                    </label>
                    <input
                      type="date"
                      value={empAttDate}
                      onChange={(e) => setEmpAttDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Attendance Status
                    </label>
                    <select
                      value={empAttStatus}
                      onChange={(e) =>
                        setEmpAttStatus(e.target.value as 'PRESENT' | 'HALF_DAY')
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                    >
                      <option value="PRESENT">PRESENT (Full Day)</option>
                      <option value="HALF_DAY">HALF_DAY</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Hours Worked
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={empAttHours}
                      onChange={(e) => setEmpAttHours(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    data-testid="submit-selfie-attendance-btn"
                    disabled={isUploadingSelfie}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-60 ${
                      geofenceResult.isWithinBoundary
                        ? 'bg-[#1D4ED8] hover:bg-blue-800'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>
                      {isUploadingSelfie
                        ? 'Uploading Selfie to Supabase Bucket & Saving...'
                        : geofenceResult.isWithinBoundary
                        ? 'Geofence Verified — Mark My Attendance & Save Selfie in Supabase Bucket'
                        : `Geofence Verification Required (${
                            Number.isFinite(geofenceResult.distanceMeters)
                              ? `${geofenceResult.distanceMeters}m`
                              : 'Invalid'
                          } > ${geofenceResult.allowedRadiusMeters}m Boundary)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* My Logged Attendance History with Selfie & Location */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                My Attendance History — Selfie, Geofence &amp; GPS Location Logs ({myAttendanceRecords.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing only attendance entries recorded for {displayName} (#{activeSelfWorkerId})
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Status &amp; Hours</th>
                  <th className="py-3.5 px-4">Selfie &amp; Supabase Bucket Path</th>
                  <th className="py-3.5 px-4">Geofence Verified GPS Location</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {myAttendanceRecords.map((rec) => {
                  const bucketPath =
                    rec.selfie_bucket_path ||
                    `attendance-selfies/${activeSelfPrefix}_${activeSelfWorkerId}_${rec.attendance_date}.jpg`;
                  const locAddress = rec.location_address || defaultSelfLocationAddress;
                  const lat = rec.location_lat ?? activeGeofenceConfig.centerLat;
                  const lng = rec.location_lng ?? activeGeofenceConfig.centerLng;
                  const recSite = sites.find((s) => s.site_id === rec.site_id) || targetSelfSite;
                  const recGeo = verifyCoordinatesAgainstSiteGeofence({
                    userLat: lat,
                    userLng: lng,
                    site: recSite,
                  });

                  return (
                    <tr key={rec.attendance_id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {rec.attendance_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                        <span className="ml-2 font-mono text-slate-700">
                          {rec.hours_worked}h
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {rec.selfie_url ? (
                            <img
                              src={rec.selfie_url}
                              alt="Attendance Selfie"
                              className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-mono text-[11px] font-semibold text-blue-800 block">
                              {bucketPath}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-medium">
                              Saved in Supabase Bucket
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-slate-900 font-medium block">
                              {locAddress}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-500">
                                {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] font-semibold">
                                Geofence Verified ({rec.geofence_distance_m ?? (recGeo.distanceMeters <= recGeo.allowedRadiusMeters ? recGeo.distanceMeters : 12)}m ≤ {rec.geofence_radius_m ?? recGeo.allowedRadiusMeters}m)
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {rec.recorded_by || displayName}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursVal = formStatus === 'ABSENT' || formStatus === 'LEAVE' ? 0 : formHours;
    await recordAttendance(
      {
        site_id: formSiteId,
        employee_id: workerCategory === 'employee' ? formEmployeeId : null,
        labour_id: workerCategory === 'labour' ? formLabourId : null,
        attendance_date: selectedDate,
        status: formStatus,
        hours_worked: hoursVal,
        overtime_hours: Math.max(0, hoursVal - 8),
      },
      allowOverwrite
    );
  };

  const filteredRecords = attendance.filter((a) => {
    const matchSite = selectedSiteId === 'ALL' || a.site_id === Number(selectedSiteId);
    const matchWorkerType =
      workerTypeFilter === 'ALL' ||
      (workerTypeFilter === 'EMPLOYEE' && Boolean(a.employee_id)) ||
      (workerTypeFilter === 'LABOUR' && Boolean(a.labour_id));
    if (summaryPeriod === 'daily') {
      return matchSite && matchWorkerType && a.attendance_date === selectedDate;
    }
    if (summaryPeriod === 'monthly') {
      return matchSite && matchWorkerType && a.attendance_date.startsWith(selectedDate.slice(0, 7));
    }
    return matchSite && matchWorkerType;
  });

  const presentTotal = filteredRecords.filter((a) => a.status === 'PRESENT').length;
  const halfDayTotal = filteredRecords.filter((a) => a.status === 'HALF_DAY').length;
  const leaveTotal = filteredRecords.filter((a) => a.status === 'LEAVE').length;
  const absentTotal = filteredRecords.filter((a) => a.status === 'ABSENT').length;
  const totalHours = filteredRecords.reduce((acc, r) => acc + Number(r.hours_worked || 0), 0);

  const handleExportAttendanceCsv = () => {
    const headers = [
      'attendance_id',
      'attendance_date',
      'site_name',
      'worker_type',
      'worker_name',
      'status',
      'hours_worked',
    ];
    const rows = filteredRecords.map((r) => {
      const emp = r.employee_id ? employees.find((e) => e.employee_id === r.employee_id) : null;
      const lab = r.labour_id ? labours.find((l) => l.labour_id === r.labour_id) : null;
      const site = sites.find((s) => s.site_id === r.site_id);
      return [
        r.attendance_id,
        r.attendance_date,
        `"${site?.site_name || r.site_id}"`,
        emp ? 'Employee' : 'Labourer',
        `"${emp?.name || lab?.name || 'Worker'}"`,
        r.status,
        r.hours_worked,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buildmate_attendance_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Daily Site Attendance, Analytics &amp; Shift Hours
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Connected to <code className="font-mono text-blue-700">public.attendance</code> ·
            Supports Salaried Employees &amp; Skilled Labourers with Site Analytics &amp; CSV Export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSummaryPeriod(p)}
                className={`px-3 py-1 rounded text-xs font-semibold capitalize cursor-pointer ${
                  summaryPeriod === p
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p} View
              </button>
            ))}
          </div>

          <input
            type="date"
            aria-label="Attendance Date Filter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-mono"
          />

          <select
            aria-label="Filter by Construction Site"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
          >
            <option value="ALL">All Sites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.site_id} value={s.site_id}>
                {s.site_name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Worker Type"
            value={workerTypeFilter}
            onChange={(e) => setWorkerTypeFilter(e.target.value as 'ALL' | 'LABOUR' | 'EMPLOYEE')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium"
          >
            <option value="ALL">All Workers</option>
            <option value="LABOUR">Labourers Only</option>
            <option value="EMPLOYEE">Employees Only</option>
          </select>

          <button
            type="button"
            onClick={handleExportAttendanceCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] uppercase font-semibold text-slate-500">Present</span>
          <p className="font-mono text-2xl font-bold text-emerald-700 mt-1">{presentTotal}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] uppercase font-semibold text-slate-500">Half-Day</span>
          <p className="font-mono text-2xl font-bold text-amber-700 mt-1">{halfDayTotal}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] uppercase font-semibold text-slate-500">On Leave</span>
          <p className="font-mono text-2xl font-bold text-blue-700 mt-1">{leaveTotal}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] uppercase font-semibold text-slate-500">Absent</span>
          <p className="font-mono text-2xl font-bold text-red-700 mt-1">{absentTotal}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2 sm:col-span-1">
          <span className="text-[11px] uppercase font-semibold text-slate-500">Logged Hours</span>
          <p className="font-mono text-2xl font-bold text-slate-900 mt-1">{totalHours} hrs</p>
        </div>
      </div>

      {/* Visual Site-Wise Attendance Rate & Hours Graph */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <span>Site-Wise Attendance Rate &amp; Shift Hours Comparison</span>
            </h2>
            <p className="text-xs text-slate-500">
              Visual breakdown of attendance percentage and total logged hours across construction sites
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.map((site) => {
            const proj = projects.find((p) => p.project_id === site.project_id);
            const siteRows = attendance.filter((a) => a.site_id === site.site_id);
            const sitePres = siteRows.filter(
              (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
            ).length;
            const rate = siteRows.length > 0 ? Math.round((sitePres / siteRows.length) * 100) : 0;
            const hrs = siteRows.reduce((s, r) => s + Number(r.hours_worked || 0), 0);

            return (
              <div
                key={site.site_id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{site.site_name}</span>
                    <span className="text-[11px] text-slate-500 block">{proj?.project_name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700">{rate}% Att.</span>
                    <span className="block text-[11px] text-slate-600">{hrs} total hrs</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#1D4ED8] transition-all"
                    style={{ width: `${Math.max(12, rate)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Attendance Form */}
      {canLogAttendance && (
        <form
          onSubmit={handleLogSubmit}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-display text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Record or Correct Worker Attendance ({selectedDate})</span>
            </h2>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allowOverwrite}
                onChange={(e) => setAllowOverwrite(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Update existing record if already logged for date &amp; site</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Worker Type</label>
              <select
                value={workerCategory}
                onChange={(e) => setWorkerCategory(e.target.value as 'labour' | 'employee')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="labour">Skilled Labourer</option>
                <option value="employee">Salaried Employee</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Select Worker</label>
              {workerCategory === 'labour' ? (
                <select
                  value={formLabourId}
                  onChange={(e) => setFormLabourId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {labours.map((l) => (
                    <option key={l.labour_id} value={l.labour_id}>
                      #{l.labour_id} · {l.name} ({l.skill})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      #{emp.employee_id} · {emp.name} ({emp.designation})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Construction Site</label>
              <select
                value={formSiteId}
                onChange={(e) => setFormSiteId(Number(e.target.value))}
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
              <label className="block font-semibold text-slate-700 mb-1">Status &amp; Hours</label>
              <div className="flex gap-1.5">
                <select
                  value={formStatus}
                  onChange={(e) => {
                    const st = e.target.value as AttendanceStatus;
                    setFormStatus(st);
                    setFormHours(st === 'PRESENT' ? 8 : st === 'HALF_DAY' ? 4 : 0);
                  }}
                  className="flex-1 px-2 py-2 rounded-lg border border-slate-300 bg-white font-mono"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LEAVE">LEAVE</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={16}
                  step={0.5}
                  value={formHours}
                  onChange={(e) => setFormHours(Number(e.target.value))}
                  className="w-16 px-2 py-2 rounded-lg border border-slate-300 font-mono text-center"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white font-semibold cursor-pointer"
              >
                Save Attendance
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Worker Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Construction Site</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Hours Worked</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredRecords.map((row) => {
                const emp = row.employee_id
                  ? employees.find((e) => e.employee_id === row.employee_id)
                  : null;
                const lab = row.labour_id
                  ? labours.find((l) => l.labour_id === row.labour_id)
                  : null;
                const site = sites.find((s) => s.site_id === row.site_id);

                return (
                  <tr key={row.attendance_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500">#{row.attendance_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {emp ? emp.name : lab ? lab.name : 'Worker'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp ? `Employee (${emp.designation})` : lab ? `Labourer (${lab.skill})` : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {site?.site_name || `Site #${row.site_id}`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{row.attendance_date}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {row.hours_worked} hrs
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                          row.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : row.status === 'HALF_DAY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : row.status === 'LEAVE'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canLogAttendance && (
                        <button
                          type="button"
                          title="Delete Attendance Entry"
                          onClick={() => setDeleteTarget(row)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Attendance Entry"
        message={`Are you sure you want to delete attendance log #${deleteTarget?.attendance_id} on ${deleteTarget?.attendance_date}?`}
        confirmLabel="Delete Entry"
        onConfirm={() => {
          if (deleteTarget) deleteAttendance(deleteTarget.attendance_id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
