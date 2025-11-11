import { useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import CountryMap from "./CountryMap";

interface CountryMapMarker {
  lat: number;
  lng: number;
  name: string;
}

interface DemographicCountry {
  country: string;
  customers: number;
  percentage: number;
}

interface WorldMapCardProps {
  countries: DemographicCountry[];
  loading: boolean;
  totalCustomers: number;
  markers?: CountryMapMarker[];
  entityLabel?: string;
}

const flagAssets: Record<string, string> = {
  usa: "./images/country/country-01.svg",
  "united states": "./images/country/country-01.svg",
  india: "./images/country/country-03.svg",
  france: "./images/country/country-02.svg",
  germany: "./images/country/country-04.svg",
  canada: "./images/country/country-05.svg",
  australia: "./images/country/country-06.svg"
};

const countryCoordinates: Record<string, { lat: number; lng: number }> = {
  india: { lat: 20.5937, lng: 78.9629 },
  usa: { lat: 37.0902, lng: -95.7129 },
  "united states": { lat: 37.0902, lng: -95.7129 },
  france: { lat: 46.2276, lng: 2.2137 },
  germany: { lat: 51.1657, lng: 10.4515 },
  canada: { lat: 56.1304, lng: -106.3468 },
  australia: { lat: -25.2744, lng: 133.7751 }
};

function getCountryBadge(country: string) {
  const key = country.toLowerCase().trim();
  return flagAssets[key] || null;
}

function getInitials(country: string) {
  const parts = country.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join(" ").toUpperCase();
}

function getMarker(country: string, customers: number) {
  const key = country.toLowerCase().trim();
  const coords = countryCoordinates[key];
  if (!coords) {
    return null;
  }
  return {
    lat: coords.lat,
    lng: coords.lng,
    name: `${country} • ${customers.toLocaleString()}`,
  };
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

export default function WorldMapCard({ countries, loading, totalCustomers, markers, entityLabel }: WorldMapCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const label = entityLabel || "Customers";
  const labelLower = label.toLowerCase();

  const displayCountries = useMemo(() => countries.slice(0, 4), [countries]);
  const maxCustomers = useMemo(
    () => displayCountries.reduce((max, entry) => Math.max(max, entry.customers), 0),
    [displayCountries]
  );

  const derivedMarkers = useMemo(
    () =>
      countries
        .map((entry) => getMarker(entry.country, entry.customers))
        .filter((entry): entry is CountryMapMarker => Boolean(entry)),
    [countries]
  );

  const mapMarkers = useMemo(
    () => (derivedMarkers.length ? derivedMarkers : markers ?? []),
    [derivedMarkers, markers]
  );

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{label} Demographic</h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">Number of {labelLower} based on country</p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={toggleDropdown}>
            <MoreDotIcon className="size-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
          </button>
          <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              View Details
            </DropdownItem>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex w-full rounded-lg text-left font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Export Data
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      <div className="my-6 overflow-hidden rounded-2xl border border-gray-200 px-4 py-6 dark:border-gray-800 sm:px-6">
        <div className="mapOne map-btn mx-auto h-[260px] w-full md:h-[320px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading {labelLower} map...</div>
          ) : (
            <CountryMap markers={mapMarkers.length ? mapMarkers : undefined} />
          )}
        </div>
        {!loading && !mapMarkers.length ? (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">No geographic data available.</div>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Loading {labelLower} statistics...
        </div>
      ) : displayCountries.length ? (
        <div className="space-y-5">
          {displayCountries.map((entry) => {
            const badge = getCountryBadge(entry.country);
            const initials = getInitials(entry.country);
            const progress = maxCustomers ? Math.round((entry.customers / maxCustomers) * 100) : 0;
            return (
              <div key={entry.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {badge ? (
                      <img src={badge} alt={entry.country} className="h-6 w-6 object-contain" />
                    ) : (
                      <span className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-300">{initials}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-theme-sm dark:text-white/90">{entry.country}</p>
                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                      {formatNumber(entry.customers)} {label}
                    </span>
                  </div>
                </div>

                <div className="flex w-full max-w-[140px] items-center gap-3">
                  <div className="relative block h-2 w-full max-w-[100px] rounded-sm bg-gray-200 dark:bg-gray-800">
                    <div
                      className="absolute left-0 top-0 flex h-full items-center justify-center rounded-sm bg-brand-500 text-xs font-medium text-white"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{entry.percentage}%</p>
                </div>
              </div>
            );
          })}
          {totalCustomers ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm font-semibold text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
              Total {labelLower}: {formatNumber(totalCustomers)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No {labelLower} distribution available.
        </div>
      )}
    </div>
  );
}
