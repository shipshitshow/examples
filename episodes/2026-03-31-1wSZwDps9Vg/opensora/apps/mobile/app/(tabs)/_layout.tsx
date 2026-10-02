import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { colors } from '../../src/theme';

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      {/* Film frame: two vertical notches on a rectangle */}
      <View style={[styles.filmFrame, { borderColor: color }]}>
        <View style={[styles.filmNotch, { backgroundColor: color, left: 2 }]} />
        <View style={[styles.filmNotch, { backgroundColor: color, right: 2 }]} />
      </View>
      {/* Play triangle inside */}
      <View style={[styles.playTriangle, { borderLeftColor: color }]} />
    </View>
  );
}

function CreateIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      {/* Camera body */}
      <View style={[styles.camBody, { borderColor: color }]}>
        {/* Lens circle */}
        <View style={[styles.camLens, { borderColor: color }]} />
      </View>
      {/* Viewfinder bump */}
      <View style={[styles.camBump, { backgroundColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={styles.icon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#0d0d10',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          letterSpacing: -0.2,
          color: colors.textPrimary,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarLabel: 'Create',
          tabBarIcon: ({ color }) => <CreateIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Film frame (home)
  filmFrame: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  filmNotch: {
    position: 'absolute',
    width: 3,
    height: 5,
    borderRadius: 1,
    top: '50%',
    marginTop: -2.5,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 1,
  },
  // Camera (create)
  camBody: {
    width: 18,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 2,
  },
  camLens: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  camBump: {
    position: 'absolute',
    top: 1,
    width: 6,
    height: 4,
    borderRadius: 2,
    left: '50%',
    marginLeft: -3,
  },
  // Profile
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    marginBottom: 1,
    position: 'absolute',
    top: 1,
  },
  profileBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    position: 'absolute',
    bottom: 1,
  },
});
