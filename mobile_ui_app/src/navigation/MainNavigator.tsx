/**
 * Main Navigator
 * Navigation stack for authenticated users
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import DoctorListScreen from '../screens/DoctorList';
import DashboardScreen from '../screens/Dashboard';
import BookAppointmentScreen from '../screens/BookAppointment/BookAppointmentScreen';
import BookingConfirmationScreen from '../screens/BookingConfirmation/BookingConfirmationScreen';
import AppointmentListScreen from '../screens/AppointmentList/AppointmentListScreen';
// Import other screens as they are created
// import FindDoctorScreen from '../screens/FindDoctor';
// import AISearchScreen from '../screens/AISearch';
// import DoctorDetailsScreen from '../screens/DoctorDetails';
// import SelectSlotScreen from '../screens/SelectSlot';
// import ConfirmationScreen from '../screens/Confirmation';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="DoctorList"
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen 
        name="DoctorList" 
        component={DoctorListScreen}
        options={{
          title: 'Find Doctors',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="BookAppointment" 
        component={BookAppointmentScreen}
        options={{
          title: 'Book Appointment',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="BookingConfirmation" 
        component={BookingConfirmationScreen}
        options={{
          title: 'Booking Confirmed',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="AppointmentList" 
        component={AppointmentListScreen}
        options={{
          title: 'My Appointments',
          headerShown: false,
        }}
      />
      {/* Add other screens here as they are implemented */}
    </Stack.Navigator>
  );
};
