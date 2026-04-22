import { colors } from "@/src/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: colors.pink,
        tabBarInactiveTintColor: "rgba(255,255,255,0.65)",

        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          height: 70,
          borderRadius: 20,
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 10,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 12,
          elevation: 10,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },

        tabBarIconStyle: {
          marginTop: 2,
        },

        tabBarItemStyle: {
          justifyContent: "center",
        },

        sceneStyle: {
          backgroundColor: colors.black,
        },

        tabBarIcon: ({ color, focused }) => {
          let iconName: any;

          if (route.name === "index") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "library") {
            iconName = focused
              ? "musical-notes"
              : "musical-notes-outline";
          } else if (route.name === "store") {
            iconName = focused ? "bag" : "bag-outline";
          } else if (route.name === "news") {
            iconName = focused ? "newspaper" : "newspaper-outline";
          } else if (route.name === "profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: "Biblioteca",
        }}
      />

      <Tabs.Screen
        name="store"
        options={{
          title: "Loja",
        }}
      />

      <Tabs.Screen
        name="news"
        options={{
          title: "Notícias",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
        }}
      />
    </Tabs>
  );
}