import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import DoctorCard from "../../components/DoctorCard/DoctorCard";
import type { Doctor, DoctorSearchParams } from "../../types/doctor.types";
import {
  getDoctors,
  searchDoctors,
  getFilterOptions,
} from "../../api/doctor.api";
import styles from "./DoctorListPage.module.css";

interface LocationState {
  specialization?: string;
}

const DoctorListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const isMountedRef = useRef(true);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [_totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [activeFilterTab, setActiveFilterTab] = useState<
    "Speciality" | "Location"
  >("Speciality");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    state?.specialization || "",
  );
  const [selectedLocation, setSelectedLocation] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ city: string; state: string }[]>(
    [],
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchFilterOptions();
    fetchDoctors();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery === "" && doctors.length === 0) return;
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchDoctors(1, false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFilterOptions = async () => {
    try {
      const response = await getFilterOptions();
      if (!isMountedRef.current) return;
      if (response.success) {
        setSpecialties(response.data.specializations || []);
        setLocations(response.data.locations || []);
      }
    } catch {
      /* silent */
    }
  };

  const extractCity = (loc: string) => loc.split(",")[0].trim();

  const fetchDoctors = async (
    page = 1,
    append = false,
    overrides?: { specialty?: string; location?: string; search?: string },
  ) => {
    if (loading) return;
    try {
      setLoading(true);
      setError(null);

      const activeSpecialty =
        overrides?.specialty !== undefined
          ? overrides.specialty
          : selectedSpecialty;
      const activeLocation =
        overrides?.location !== undefined
          ? overrides.location
          : selectedLocation;
      const activeSearch =
        overrides?.search !== undefined ? overrides.search : searchQuery;

      const hasFilters = activeSearch || activeSpecialty || activeLocation;
      let response;

      if (hasFilters) {
        const params: DoctorSearchParams = {
          page,
          limit: 50,
          ...(activeSearch && { search: activeSearch }),
          ...(activeSpecialty && { specialization: activeSpecialty }),
          ...(activeLocation && { city: extractCity(activeLocation) }),
        };
        response = await searchDoctors(params);
      } else {
        response = await getDoctors({
          page,
          limit: 50,
          sortBy: "rating",
          sortOrder: "desc",
        });
      }

      if (!isMountedRef.current) return;

      if (response.success) {
        setDoctors(
          append ? (prev) => [...prev, ...response.data] : response.data,
        );
        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.pages);
        setHasMore(response.pagination.page < response.pagination.pages);
      } else {
        setError(response.error || "Failed to load doctors");
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleFilterSelect = (
    type: "Speciality" | "Location",
    value: string,
  ) => {
    let newSpecialty = selectedSpecialty;
    let newLocation = selectedLocation;

    if (type === "Speciality") {
      newSpecialty = value === selectedSpecialty ? "" : value;
      setSelectedSpecialty(newSpecialty);
    } else {
      newLocation = value === selectedLocation ? "" : value;
      setSelectedLocation(newLocation);
    }
    setCurrentPage(1);
    fetchDoctors(1, false, {
      specialty: newSpecialty,
      location: newLocation,
      search: searchQuery,
    });
  };

  const handleClearFilters = () => {
    setSelectedSpecialty("");
    setSelectedLocation("");
    setSearchQuery("");
    setCurrentPage(1);
    fetchDoctors(1, false, { specialty: "", location: "", search: "" });
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchDoctors(currentPage + 1, true);
  };

  const handleBookAppointment = (doctor: Doctor) => {
    navigate(`/book-appointment/${doctor.id}`, { state: { doctor } });
  };

  const locationDisplay = (loc: { city: string; state: string }) =>
    `${loc.city}, ${loc.state}`;
  const hasActiveFilters = selectedSpecialty || selectedLocation || searchQuery;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/dashboard" className={styles.backLink}>
            ← Dashboard
          </Link>
          <h1 className={styles.pageTitle}>🔍 Find Doctors</h1>
          <div className={styles.headerActions}>
            <Link to="/appointments" className={styles.headerLink}>
              My Appointments
            </Link>
            <Link to="/ai-assistant" className={styles.headerLink}>
              🤖 AI Chat
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Search bar */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search by name, specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
          <button
            className={styles.filterToggle}
            onClick={() => setShowFilters((v) => !v)}
          >
            ⚙️ Filters {hasActiveFilters ? "•" : ""}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className={styles.filterPanel}>
            <div className={styles.filterTabs}>
              {(["Speciality", "Location"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`${styles.filterTab} ${activeFilterTab === tab ? styles.filterTabActive : ""}`}
                  onClick={() => setActiveFilterTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={styles.filterOptions}>
              {activeFilterTab === "Speciality" &&
                specialties.map((s) => (
                  <button
                    key={s}
                    className={`${styles.filterChip} ${selectedSpecialty === s ? styles.filterChipActive : ""}`}
                    onClick={() => handleFilterSelect("Speciality", s)}
                  >
                    {s}
                  </button>
                ))}
              {activeFilterTab === "Location" &&
                locations.map((loc) => {
                  const display = locationDisplay(loc);
                  return (
                    <button
                      key={display}
                      className={`${styles.filterChip} ${selectedLocation === display ? styles.filterChipActive : ""}`}
                      onClick={() => handleFilterSelect("Location", display)}
                    >
                      📍 {display}
                    </button>
                  );
                })}
            </div>

            {hasActiveFilters && (
              <button
                className={styles.clearFilters}
                onClick={handleClearFilters}
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {(selectedSpecialty || selectedLocation) && (
          <div className={styles.activeFilters}>
            {selectedSpecialty && (
              <span className={styles.activeChip}>
                {selectedSpecialty}
                <button
                  onClick={() =>
                    handleFilterSelect("Speciality", selectedSpecialty)
                  }
                >
                  ✕
                </button>
              </span>
            )}
            {selectedLocation && (
              <span className={styles.activeChip}>
                📍 {selectedLocation}
                <button
                  onClick={() =>
                    handleFilterSelect("Location", selectedLocation)
                  }
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {initialLoading ? (
          <div className={styles.loadingCenter}>
            <div className={styles.spinner} />
            <p>Loading doctors...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <p>⚠️ {error}</p>
            <button
              className={styles.retryButton}
              onClick={() => fetchDoctors()}
            >
              Retry
            </button>
          </div>
        ) : doctors.length === 0 ? (
          <div className={styles.emptyBox}>
            <span className={styles.emptyIcon}>👨‍⚕️</span>
            <p className={styles.emptyTitle}>No doctors found</p>
            <p className={styles.emptySubtitle}>
              Try adjusting your filters or search terms
            </p>
            {hasActiveFilters && (
              <button
                className={styles.retryButton}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className={styles.resultsCount}>
              {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found
            </p>
            <div className={styles.grid}>
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBookAppointment={handleBookAppointment}
                />
              ))}
            </div>

            {hasMore && (
              <div className={styles.loadMoreRow}>
                <button
                  className={styles.loadMoreButton}
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <span className={styles.spinnerSm} />
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorListPage;
