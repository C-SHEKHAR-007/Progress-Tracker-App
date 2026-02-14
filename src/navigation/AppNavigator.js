import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import DashboardScreen from '../screens/Dashboard';
import LibraryScreen from '../screens/Library';
import CollectionsScreen from '../screens/Collections';
import ManageScreen from '../screens/Manage';
import PlayerScreen from '../screens/Player';
import AddFilesScreen from '../screens/AddFiles';
import CollectionDetailScreen from '../screens/CollectionDetail';
import ProgressMapScreen from '../screens/ProgressMap';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Library':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'Collections':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Progress':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Manage':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#13131a',
          borderTopColor: '#1e1e2e',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#13131a',
        },
        headerTintColor: '#e2e8f0',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{ title: 'Library' }}
      />
      <Tab.Screen 
        name="Collections" 
        component={CollectionsScreen}
        options={{ title: 'Collections' }}
      />
      <Tab.Screen 
        name="Progress" 
        component={ProgressMapScreen}
        options={{ title: 'Progress' }}
      />
      <Tab.Screen 
        name="Manage" 
        component={ManageScreen}
        options={{ title: 'Manage' }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#13131a',
        },
        headerTintColor: '#e2e8f0',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: '#0a0a0f',
        },
      }}
    >
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          title: 'Now Playing',
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="AddFiles"
        component={AddFilesScreen}
        options={{
          title: 'Add Files',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="CollectionDetail"
        component={CollectionDetailScreen}
        options={({ route }) => ({
          title: route.params?.collection?.name || 'Collection',
        })}
      />
    </Stack.Navigator>
  );
}
