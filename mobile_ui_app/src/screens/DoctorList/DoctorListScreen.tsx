/**
 * DoctorListScreen
 * Main screen for browsing and searching doctors
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { DoctorCard } from '../../components/DoctorCard';
import { Doctor, DoctorSearchParams } from '../../types/doctor.types';
import { getDoctors, searchDoctors, getFilterOptions } from '../../api/doctor.api';
import { DoctorListScreenProps } from '../../navigation/types';
import { useAppDispatch } from '../../store/hooks';
import { logoutUser } from '../../store/auth/authThunks';
import { resetAuth } from '../../store/auth/authSlice';
import { useAuth } from '../../context/AuthContext';

// Location type for filter options
type LocationStats = {
  city: string;
  state: string;
};

export default function DoctorListScreen({ navigation }: DoctorListScreenProps) {
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  
  // Track if component is mounted to prevent alerts on unmount
  const isMountedRef = useRef(true);

  // State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<'Speciality' | 'Location'>('Speciality');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  // Filter Options
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationStats[]>([]);

  /**
   * Track component mount state
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Fetch filter options on mount
   */
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  /**
   * Initial load - fetch 50 doctors
   */
  useEffect(() => {
    fetchDoctors();
  }, []);

  /**
   * Debounced search effect - triggers API call 2 seconds after user stops typing
   */
  useEffect(() => {
    // Skip debounce on initial mount
    if (searchQuery === '' && doctors.length === 0) {
      return;
    }

    // Set up debounce timer
    const debounceTimer = setTimeout(() => {
      console.log('🔍 Debounced search triggered for:', searchQuery);
      setCurrentPage(1);
      fetchDoctors(1, false);
    }, 500); // 0.5 second delay

    // Cleanup: clear timer if searchQuery changes or component unmounts
    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]);

  /**
   * Extract city name from location display text
   * Handles both "City, State" format and plain city name
   */
  const extractCityFromLocation = (location: string): string => {
    if (!location) return '';
    // Split by comma and take the first part (the city)
    return location.split(',')[0].trim();
  };

  /**
   * Fetch available filter options
   */
  const fetchFilterOptions = async () => {
    try {
      const response = await getFilterOptions();
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;
      
      if (response.success) {
        console.log('Fetched filter options:', response.data);
        setSpecialties(response.data.specializations || []);
        setLocations(response.data.locations || []);
        // Note: Conditions and symptoms are not supported by the backend GraphQL schema
      }
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
    }
  };

  /**
   * Fetch doctors with current filters
   * @param page - Page number to fetch
   * @param append - Whether to append to existing doctors or replace
   * @param overrideFilters - Optional filter overrides (used when updating filters before state updates)
   */
  const fetchDoctors = async (
    page = 1, 
    append = false,
    overrideFilters?: {
      specialty?: string;
      location?: string;
      search?: string;
    }
  ) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Use override filters if provided, otherwise use state
      const activeSpecialty = overrideFilters?.specialty !== undefined ? overrideFilters.specialty : selectedSpecialty;
      const activeLocation = overrideFilters?.location !== undefined ? overrideFilters.location : selectedLocation;
      const activeSearch = overrideFilters?.search !== undefined ? overrideFilters.search : searchQuery;

      console.log('🔍 Fetching doctors with filters:', { activeSpecialty, activeLocation, activeSearch, page });

      // Only use search endpoint if there's an actual search query or advanced filters
      const hasSearchQuery = activeSearch || activeSpecialty || activeLocation;

      let response;

      if (hasSearchQuery) {
        // Use search endpoint for actual searches
        const extractedCity = activeLocation ? extractCityFromLocation(activeLocation) : null;
        console.log('🏙️ Location filter:', { activeLocation, extractedCity });
        
        const searchParams: DoctorSearchParams = {
          page,
          limit: 50,
          ...(activeSearch && { search: activeSearch }),
          ...(activeSpecialty && { specialization: activeSpecialty }),
          ...(extractedCity && { city: extractedCity }),
        };
        console.log('📤 Sending search params:', JSON.stringify(searchParams, null, 2));
        response = await searchDoctors(searchParams);
        console.log('📥 Search response:', { 
          success: response.success, 
          doctorCount: response.data?.length || 0,
          totalResults: response.pagination?.total || 0
        });
      } else {
        // Use regular list endpoint for basic listing
        // Note: Date filtering would need backend support in the list endpoint
        // For now, ignoring date filter when using list endpoint
        response = await getDoctors({
          page,
          limit: 50,
          sortBy: 'rating',
          sortOrder: 'desc',
        });
      }

      if (response.success) {
        const newDoctors = response.data;

        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        if (append) {
          setDoctors(prev => [...prev, ...newDoctors]);
        } else {
          setDoctors(newDoctors);
        }

        setCurrentPage(response.pagination.page);
        setTotalPages(response.pagination.pages);
        setHasMore(response.pagination.page < response.pagination.pages);
      } else {
        // Only update state if component is still mounted
        if (!isMountedRef.current) return;
        
        // Handle API error response
        const errorMessage = response.error || 'Failed to load doctors. Please check your connection.';
        setError(errorMessage);
        console.error('API Error:', errorMessage);
      }
    } catch (error: any) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;
      
      console.error('Error fetching doctors:', error);
      const errorMessage = error.message || 'Network error. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;
      
      setLoading(false);
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  /**
   * Handle search button press
   */
  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctors(1, false);
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchDoctors(1, false);
  };

  /**
   * Handle load more (pagination)
   */
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      fetchDoctors(nextPage, true);
    }
  };

  /**
   * Handle filter selection
   */
  const handleFilterSelect = (filterType: 'Speciality' | 'Location', option: string | LocationStats) => {
    const value = getOptionDisplayText(option);
    console.log(`🔍 Filter selected: ${filterType} = ${value}`);
    
    let newSpecialty = selectedSpecialty;
    let newLocation = selectedLocation;
    
    switch (filterType) {
      case 'Speciality':
        newSpecialty = value === selectedSpecialty ? '' : value; // Toggle off if same
        setSelectedSpecialty(newSpecialty);
        break;
      case 'Location':
        newLocation = value === selectedLocation ? '' : value; // Toggle off if same
        setSelectedLocation(newLocation);
        break;
    }
    
    setCurrentPage(1);
    
    // Pass the new filter values directly to fetchDoctors instead of waiting for state update
    fetchDoctors(1, false, {
      specialty: newSpecialty,
      location: newLocation,
      search: searchQuery,
    });
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    console.log('🔍 Clearing all filters');
    setSearchQuery('');
    setSelectedSpecialty('');
    setSelectedLocation('');
    setCurrentPage(1);
    
    // Pass empty filter values directly to fetchDoctors
    fetchDoctors(1, false, {
      specialty: '',
      location: '',
      search: '',
    });
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = () => {
    return searchQuery !== '' || selectedSpecialty !== '' || selectedLocation !== '';
  };

  /**
   * Handle book appointment
   * 
   */
  const handleBook = (doctor: Doctor) => {
    console.log('Navigating to BookAppointment for doctor:', doctor.id);
    navigation.navigate('BookAppointment', { doctor });
  };

  /**
   * Handle doctor card press (view details)
   */
  const handleDoctorPress = (doctor: Doctor) => {    // Prevent alert if component is unmounted
    if (!isMountedRef.current) return;
        const qualificationsText = doctor.qualifications && doctor.qualifications.length > 0
      ? doctor.qualifications.map(q => q.degree).join(', ')
      : 'Not specified';
    
    Alert.alert(
      'Doctor Details',
      `${doctor.bio || 'No bio available'}\n\nQualifications: ${qualificationsText}\n\nRating: ${doctor.rating || 0}/5 (${doctor.reviewsCount || 0} reviews)`,
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    // Prevent alert if component is unmounted
    if (!isMountedRef.current) return;
    
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          console.log('Logging out...');
          dispatch(resetAuth());
          await logout();
          console.log('Logout complete');
        },
      },
    ]);
  };

  /**
   * Handle back navigation (acts as logout since this is the first screen)
   */
  const handleBack = () => {
    handleLogout();
  };

  /**
   * Render error state
   */
  const renderError = () => {
    if (!error || loading) {
      return null;
    }

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchDoctors(1, false)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render empty list
   */
  const renderEmpty = () => {
    if (initialLoading) {
      return null;
    }

    if (loading && doctors.length === 0) {
      return null;
    }

    if (error) {
      return renderError();
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>No doctors found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your search filters</Text>
      </View>
    );
  };

  /**
   * Render footer (loading indicator for pagination)
   */
  const renderFooter = () => {
    if (!loading || doctors.length === 0) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#5A7FD8" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  /**
   * Get filter options based on active tab
   */
  const getActiveFilterOptions = (): Array<string | LocationStats> => {
    switch (activeTab) {
      case 'Speciality':
        return specialties;
      case 'Location':
        return locations;
      default:
        return [];
    }
  };

  /**
   * Get display text for a filter option
   */
  const getOptionDisplayText = (option: string | LocationStats): string => {
    if (typeof option === 'string') {
      return option;
    }
    return `${option.city}, ${option.state}`;
  };

  /**
   * Get unique key for a filter option
   */
  const getOptionKey = (option: string | LocationStats): string => {
    if (typeof option === 'string') {
      return option;
    }
    return `${option.city}-${option.state}`;
  };

  /**
   * Check if option is selected
   */
  const isOptionSelected = (option: string | LocationStats): boolean => {
    const selectedValue = getSelectedValue();
    if (typeof option === 'string') {
      return selectedValue === option;
    }
    // For location objects, compare the display text
    return selectedValue === `${option.city}, ${option.state}`;
  };

  /**
   * Get selected filter value
   */
  const getSelectedValue = () => {
    switch (activeTab) {
      case 'Speciality':
        return selectedSpecialty;
      case 'Location':
        return selectedLocation;
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find a Doctor</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}>
          {(['Speciality', 'Location'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
                {tab === 'Speciality' && selectedSpecialty && ' ✓'}
                {tab === 'Location' && selectedLocation && ' ✓'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filter Options */}
      <View style={styles.filterOptionsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterOptionsContent}>
          {getActiveFilterOptions().map((option) => (
            <TouchableOpacity
              key={getOptionKey(option)}
              style={[
                styles.filterOption,
                isOptionSelected(option) && styles.selectedFilterOption,
              ]}
              onPress={() => handleFilterSelect(activeTab, option)}>
              <Text
                numberOfLines={1}
                style={[
                  styles.filterOptionText,
                  isOptionSelected(option) && styles.selectedFilterOptionText,
                ]}>
                {getOptionDisplayText(option)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Active Filters Indicator */}
      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.activeFiltersContent}>
            {searchQuery && (
              <View style={styles.activeFilterTag}>
                <Text numberOfLines={1} style={styles.activeFilterText}>Search: "{searchQuery}"</Text>
              </View>
            )}
            {selectedSpecialty && (
              <View style={styles.activeFilterTag}>
                <Text numberOfLines={1} style={styles.activeFilterText}>Specialty: {selectedSpecialty}</Text>
              </View>
            )}
            {selectedLocation && (
              <View style={styles.activeFilterTag}>
                <Text numberOfLines={1} style={styles.activeFilterText}>Location: {selectedLocation}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>Clear All ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by doctor name, specialty, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Doctor List */}
      <FlatList
        data={doctors}
        renderItem={({ item }) => (
          <DoctorCard doctor={item} onBook={handleBook} onPress={handleDoctorPress} />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Loading Overlay - Only show during initial load */}
      {initialLoading && !error && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5A7FD8" />
          <Text style={styles.loadingText}>Loading doctors...</Text>
        </View>
      )}

      {/* Error Overlay - Show error message for initial load failures */}
      {initialLoading && error && (
        <View style={styles.errorOverlay}>
          {renderError()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#5A7FD8',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 40, // Compensate for back button
  },
  headerSpacer: {
    width: 40,
  },
  tabWrapper: {
    backgroundColor: '#FFFFFF',
    height: 44,
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#5A7FD8',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#5A7FD8',
    fontWeight: '600',
  },
  filterOptionsWrapper: {
    backgroundColor: '#FFFFFF',
    height: 52,
    justifyContent: 'center',
  },
  filterOptionsContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFilterOption: {
    backgroundColor: '#5A7FD8',
    borderColor: '#5A7FD8',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedFilterOptionText: {
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 60,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearSearchText: {
    fontSize: 18,
    color: '#999',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#5A7FD8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  activeFiltersContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 8,
    alignItems: 'center',
  },
  activeFilterTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FFD54F',
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
    textAlign: 'center',
  },
  clearFiltersButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#5A7FD8',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});