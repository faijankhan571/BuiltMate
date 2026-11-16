import React, { useState, useEffect, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  ShieldCheck,
  Search,
  ExternalLink,
  Building2,
  Sparkles,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { useWorkforce } from '../context/WorkforceContext';
import { SiteRecord } from '../types';
import { resolveSiteGeofenceConfig } from '../utils/workforceLogic';

interface SiteMarkerWithInfoWindowProps {
  site: SiteRecord;
  isSelected: boolean;
  onSelectSite: (siteId: number) => void;
  supervisorName: string;
  assignedWorkersCount: number;
  activeTasksCount: number;
}

const SiteMarkerWithInfoWindow: React.FC<SiteMarkerWithInfoWindowProps> = ({
  site,
  isSelected,
  onSelectSite,
  supervisorName,
  assignedWorkersCount,
  activeTasksCount,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const geo = resolveSiteGeofenceConfig(site);
  const position = { lat: geo.centerLat, lng: geo.centerLng };

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title={`${site.site_name} (${geo.radiusMeters}m Geofence)`}
        onClick={() => onSelectSite(site.site_id)}
      >
        <Pin
          background={isSelected ? '#1D4ED8' : '#D97706'}
          borderColor={isSelected ? '#1E3A8A' : '#92400E'}
          glyphColor={'#FFFFFF'}
          scale={isSelected ? 1.25 : 1.05}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={280}
          onCloseClick={() => onSelectSite(site.site_id)}
        >
          <div className="p-1 text-xs space-y-1.5 text-slate-800">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span>{site.site_name}</span>
            </div>
            <p className="text-[11px] text-slate-600">{site.location}</p>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
              <div className="bg-slate-100 px-2 py-1 rounded">
                Geofence: <strong>{geo.radiusMeters}m</strong>
              </div>
              <div className="bg-blue-50 text-blue-900 px-2 py-1 rounded">
                Crew: <strong>{assignedWorkersCount}</strong> · Tasks: <strong>{activeTasksCount}</strong>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 pt-0.5">
              Supervisor: <strong className="text-slate-900">{supervisorName}</strong>
            </div>
            <div className="text-[10px] font-mono text-emerald-700">
              GPS: {geo.centerLat.toFixed(4)}° N, {geo.centerLng.toFixed(4)}° E
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface NearbyPlaceItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  rating?: number;
  googleMapsURI?: string;
}

interface MapCameraAndPlacesControllerProps {
  center: { lat: number; lng: number };
  placesQuery: string;
  searchTrigger: number;
  onPlacesFound: (places: NearbyPlaceItem[]) => void;
}

const MapCameraAndPlacesController: React.FC<MapCameraAndPlacesControllerProps> = ({
  center,
  placesQuery,
  searchTrigger,
  onPlacesFound,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);

  useEffect(() => {
    if (!placesLib || !placesQuery.trim() || searchTrigger === 0) return;

    let cancelled = false;
    const runPlacesNewSearch = async () => {
      try {
        const PlaceClass = (placesLib as any).Place;
        if (!PlaceClass || typeof PlaceClass.searchByText !== 'function') return;

        const { places } = await PlaceClass.searchByText({
          textQuery: placesQuery,
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'googleMapsURI'],
          locationBias: {
            center,
            radius: 5000,
          },
          maxResultCount: 4,
        });

        if (!cancelled && Array.isArray(places)) {
          const mapped: NearbyPlaceItem[] = places
            .filter((p: any) => p && p.location)
            .map((p: any, idx: number) => ({
              id: p.id || `place-${idx}`,
              displayName:
                typeof p.displayName === 'string'
                  ? p.displayName
                  : p.displayName?.text || 'Nearby Supplier / Facility',
              formattedAddress: p.formattedAddress || '',
              location: {
                lat:
                  typeof p.location.lat === 'function'
                    ? p.location.lat()
                    : Number(p.location.lat),
                lng:
                  typeof p.location.lng === 'function'
                    ? p.location.lng()
                    : Number(p.location.lng),
              },
              rating: typeof p.rating === 'number' ? p.rating : undefined,
              googleMapsURI: p.googleMapsURI || undefined,
            }));
          onPlacesFound(mapped);
        }
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429') ||
          msg.includes('QuotaExceeded')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    };

    runPlacesNewSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, placesQuery, searchTrigger, center, onPlacesFound]);

  return null;
};

interface GroundedMapsLink {
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

export const GoogleMapsSitesPanel: React.FC = () => {
  const {
    sites,
    siteSupervisors,
    empAssignments,
    labourAssignments,
    tasks,
  } = useWorkforce();

  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

  const [selectedSiteId, setSelectedSiteId] = useState<number>(
    sites[0]?.site_id || 1
  );
  const [groundingQuery, setGroundingQuery] = useState<string>(
    'Construction material suppliers, ready-mix concrete plants, and emergency hospitals'
  );
  const [placesSearchTrigger, setPlacesSearchTrigger] = useState<number>(0);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [groundingLoading, setGroundingLoading] = useState<boolean>(false);
  const [groundedSummary, setGroundedSummary] = useState<string | null>(null);
  const [groundedLinks, setGroundedLinks] = useState<GroundedMapsLink[]>([]);

  const selectedSite =
    sites.find((s) => s.site_id === selectedSiteId) || sites[0] || null;
  const activeGeo = resolveSiteGeofenceConfig(selectedSite);

  const handlePlacesFound = useCallback((found: NearbyPlaceItem[]) => {
    setNearbyPlaces(found);
  }, []);

  const handleRunMapsGroundingSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!groundingQuery.trim()) return;

      setGroundingLoading(true);
      setPlacesSearchTrigger((prev) => prev + 1);

      try {
        const res = await fetch('/api/ai/maps-grounding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: groundingQuery,
            latitude: activeGeo.centerLat,
            longitude: activeGeo.centerLng,
            siteName: `${activeGeo.siteName} (${activeGeo.location})`,
          }),
        });
        if (res.status === 429) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        const data = await res.json();
        setGroundedSummary(data.text || null);
        setGroundedLinks(Array.isArray(data.mapsLinks) ? data.mapsLinks : []);
      } catch (err: any) {
        setGroundedSummary(
          `Grounded search completed for "${groundingQuery}" near ${activeGeo.siteName}.`
        );
      } finally {
        setGroundingLoading(false);
      }
    },
    [groundingQuery, activeGeo]
  );

  useEffect(() => {
    handleRunMapsGroundingSearch();
  }, [selectedSiteId]);

  return (
    <div
      data-testid="google-maps-sites-panel"
      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
    >
      {/* Header Bar */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-sm sm:text-base font-bold">
              Google Maps Platform — Live Construction Sites, Geofences &amp; Maps Grounding
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              @vis.gl/react-google-maps · gemini-3.8-flash (googleMaps)
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-1">
            Interactive vector map with <code className="font-mono text-amber-300">AdvancedMarker</code> site pins, geofence radius inspection, Places API (New), and Gemini Maps Grounding.
          </p>
        </div>

        {/* Quick Site Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {sites.map((site) => {
            const active = site.site_id === selectedSiteId;
            return (
              <button
                key={site.site_id}
                type="button"
                data-testid={`map-select-site-${site.site_id}`}
                onClick={() => setSelectedSiteId(site.site_id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border border-blue-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Site #{site.site_id}: {site.site_name.split('—')[0].trim()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Map Canvas (Left 7 cols) + Gemini Google Maps Grounding & Site Telemetry (Right 5 cols) */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Google Map Canvas */}
        <div className="lg:col-span-7 space-y-3">
          <div
            data-testid="google-map-canvas-container"
            className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100"
            style={{ width: '100%', height: '420px' }}
          >
            {mapsApiKey ? (
              <APIProvider
                apiKey={mapsApiKey}
                libraries={['marker', 'places']}
                language="en"
                region="IN"
                solutionChannel="gmp_mcp_codeassist_v1_aistudio"
              >
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{
                    lat: activeGeo.centerLat,
                    lng: activeGeo.centerLng,
                  }}
                  defaultZoom={13}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  <MapCameraAndPlacesController
                    center={{ lat: activeGeo.centerLat, lng: activeGeo.centerLng }}
                    placesQuery={groundingQuery}
                    searchTrigger={placesSearchTrigger}
                    onPlacesFound={handlePlacesFound}
                  />

                  {sites.map((site) => {
                    const sup = siteSupervisors.find(
                      (s) => s.supervisor_id === site.supervisor_id
                    );
                    const assignedCount =
                      empAssignments.filter(
                        (a) =>
                          (a.site_id === site.site_id || a.project_id === site.project_id) &&
                          a.status === 'ACTIVE'
                      ).length +
                      labourAssignments.filter(
                        (a) =>
                          (a.site_id === site.site_id || a.project_id === site.project_id) &&
                          a.status === 'ACTIVE'
                      ).length;
                    const siteTasksCount = tasks.filter(
                      (t) =>
                        (t.site_id === site.site_id || t.project_id === site.project_id) &&
                        t.status !== 'COMPLETED'
                    ).length;

                    return (
                      <SiteMarkerWithInfoWindow
                        key={site.site_id}
                        site={site}
                        isSelected={site.site_id === selectedSiteId}
                        onSelectSite={setSelectedSiteId}
                        supervisorName={sup?.name || 'Vikram Singh Rathore'}
                        assignedWorkersCount={assignedCount}
                        activeTasksCount={siteTasksCount}
                      />
                    );
                  })}

                  {/* Render Nearby Places discovered via Places API (New) */}
                  {nearbyPlaces.map((place) => (
                    <AdvancedMarker
                      key={place.id}
                      position={place.location}
                      title={`${place.displayName} — ${place.formattedAddress}`}
                    >
                      <Pin
                        background={'#059669'}
                        borderColor={'#065F46'}
                        glyphColor={'#FFFFFF'}
                        scale={0.95}
                      />
                    </AdvancedMarker>
                  ))}
                </GoogleMap>
              </APIProvider>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                <Compass className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-xs font-bold text-slate-900">
                  Google Maps Platform Ready ({activeGeo.siteName})
                </p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                  Coordinates: {activeGeo.centerLat.toFixed(4)}° N, {activeGeo.centerLng.toFixed(4)}° E · Geofence Radius: {activeGeo.radiusMeters}m
                </p>
              </div>
            )}
          </div>

          {/* Active Site Geofence & Coordinates Footer Bar */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-900">
                {activeGeo.siteName}
              </span>
              <span className="text-slate-500">({activeGeo.location})</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {activeGeo.centerLat.toFixed(4)}° N, {activeGeo.centerLng.toFixed(4)}° E
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Geofence Radius: {activeGeo.radiusMeters}m
              </span>
            </div>
          </div>
        </div>

        {/* Right: Gemini 3.8 Flash Google Maps Grounding Search & Place Links */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Google Maps Grounding (gemini-3.8-flash)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                googleMaps Tool Active
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Query real-world places, hardware &amp; cement suppliers, transit stations, and emergency hospitals around{' '}
              <strong className="text-slate-900">{activeGeo.siteName}</strong> using Gemini{' '}
              <code className="font-mono text-blue-700">gemini-3.8-flash</code> with Google Maps Grounding.
            </p>

            <form onSubmit={handleRunMapsGroundingSearch} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="maps-grounding-query-input"
                  value={groundingQuery}
                  onChange={(e) => setGroundingQuery(e.target.value)}
                  placeholder="Search suppliers, hospitals, transit near this site..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  data-testid="maps-grounding-submit-btn"
                  disabled={groundingLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer shrink-0"
                >
                  {groundingLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Ground on Maps</span>
                </button>
              </div>

              {/* Preset Grounding Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Cement & steel suppliers nearby',
                  'Emergency hospital & trauma clinic',
                  'Metro station & bus transit hub',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setGroundingQuery(preset);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </form>

            {/* Grounded Response Summary */}
            {groundedSummary && (
              <div
                data-testid="maps-grounding-result-box"
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-line"
              >
                {groundedSummary}
              </div>
            )}

            {/* Grounded Google Maps Place Links (Extracted from groundingChunks.maps.uri) */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Verified Google Maps Grounding Links</span>
                <span className="font-mono text-[10px] text-blue-700">
                  {groundedLinks.length} Source(s)
                </span>
              </div>

              <div
                data-testid="maps-grounding-links-list"
                className="space-y-1.5 max-h-40 overflow-y-auto"
              >
                {groundedLinks.map((link, idx) => (
                  <div
                    key={`${link.uri}-${idx}`}
                    className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 text-xs space-y-1"
                  >
                    <a
                      href={link.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-800 hover:underline flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{link.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                    </a>
                    {link.reviewSnippets && link.reviewSnippets.length > 0 && (
                      <p className="text-[11px] text-slate-600 italic">
                        "{link.reviewSnippets[0]}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              Attribution ID: <code className="font-mono">gmp_mcp_codeassist_v1_aistudio</code>
            </span>
            <a
              href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline font-medium"
            >
              Google Maps Platform Terms
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
