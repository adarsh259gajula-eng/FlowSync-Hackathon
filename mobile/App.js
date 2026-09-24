import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, SafeAreaView, 
  StatusBar, TouchableOpacity, Modal, Dimensions, Animated, Platform, TextInput, KeyboardAvoidingView, Image
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

// Signal Colors
const COLORS = {
  red: '#EF4444',
  redGlow: 'rgba(239, 68, 68, 0.4)',
  orange: '#F59E0B',
  orangeGlow: 'rgba(245, 158, 11, 0.4)',
  green: '#10B981',
  greenGlow: 'rgba(16, 185, 129, 0.4)',
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark Mode as per spec
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [activePage, setActivePage] = useState('tab_live_map');
  const [userLocation, setUserLocation] = useState(null);
  const [userProfile, setUserProfile] = useState({ phone: 'Not set', dob: 'Not set' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [metrics, setMetrics] = useState({
    observation: { timestamp: "08:17:00", vehicle_count: 72, avg_speed: 35.7, vehicle_density: 67.0, congestion_level: "High" },
    baseline: { delay: 970.5, north_south_green: 41, east_west_green: 41 },
    optimized: { delay: 930.93, delay_reduction: 39.57, north_south_green: 51, east_west_green: 31 },
    impact: { vehicle_hours_saved: 0.01099, fuel_saved_liters: 0.00879, co2_saved_kg: 0.02023 }
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_count: 150 + Math.floor(Math.random() * 50),
            avg_speed: 12.5 + Math.random() * 5,
            vehicle_density: 0.80 + Math.random() * 0.15,
            free_flow_speed: 40.0,
            saturation_flow_rate: 1800.0,
            north_south_split: 0.5,
            east_west_split: 0.5
          })
        });
        const data = await res.json();
        if (data && data.optimized) {
           setMetrics({
             observation: data.observation || data.traffic,
             baseline: data.baseline,
             optimized: data.optimized,
             impact: data.impact || metrics.impact
           });
        }
      } catch (err) {
        console.log('Failed to fetch from backend, using fallback data', err);
      }
    };
    
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, 10000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
  }, []);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; 
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMapCenter, setCurrentMapCenter] = useState({ latitude: 37.78825, longitude: -122.4324 });
  const [mapMarkers, setMapMarkers] = useState([
    { id: 1, coordinate: { latitude: 37.78825, longitude: -122.4324 }, type: 'HIGH' }
  ]);
  
  const webviewRef = useRef(null);

  const getTrafficColor = (state) => {
    if (state === 'HIGH' || state === 'Traffic') return COLORS.red;
    if (state === 'MEDIUM' || state === 'Blockage') return COLORS.orange;
    if (state === 'Work') return '#EAB308';
    return COLORS.green;
  };

  useEffect(() => {
    if (activePage === 'tab_live_map' || activePage === 'tab_congestion' || activePage === 'tab_signals' || activePage === 'tab_eco_impact') {
      if (webviewRef.current) {
        const markersScript = mapMarkers.map(m => 
        `window.addPin(${m.coordinate.latitude}, ${m.coordinate.longitude}, '${getTrafficColor(m.type)}');`
      ).join('');
      let flyScript = '';
      if (userLocation) {
        flyScript = `
          map.flyTo([${userLocation.latitude}, ${userLocation.longitude}], 14);
          if (window.userPin) { map.removeLayer(window.userPin); }
          var userIcon = L.divIcon({
            className: "user-pin",
            iconAnchor: [0, 0],
            html: "<div style='background-color: #3B82F6; width: 16px; height: 16px; border-radius: 8px; border: 3px solid #FFF; box-shadow: 0 0 12px rgba(59, 130, 246, 0.8); position: relative; left: -8px; top: -8px;'></div>"
          });
          window.userPin = L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: userIcon, zIndexOffset: 1000}).addTo(map);
        `;
      }
      webviewRef.current.injectJavaScript(markersScript + flyScript + " true;");
    }
  }
  }, [mapMarkers, activePage, userLocation]);
  
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
            headers: { 'User-Agent': 'FlowSyncApp/1.0 (hackathon)' }
          });
          const data = await response.json();
          setSearchSuggestions(data.slice(0, 5));
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);
  
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'Alex', text: 'Huge accident on I-95 South, traffic at a standstill.', time: '2m ago', type: 'alert', reactions: { '⚠️': 2, '😱': 1 } },
    { id: 2, user: 'Sarah', text: 'Thanks for the heads up, avoiding it now!', time: '1m ago', type: 'normal', reactions: { '👍': 4, '❤️': 1 } }
  ]);
  
  const toggleReaction = (msgId, emoji) => {
    setChatMessages(chatMessages.map(msg => {
      if (msg.id === msgId) {
        const currentCount = msg.reactions?.[emoji] || 0;
        return { ...msg, reactions: { ...msg.reactions, [emoji]: currentCount > 0 ? 0 : 1 } };
      }
      return msg;
    }));
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setChatMessages([...chatMessages, { 
        id: Date.now(), user: 'You', text: '', image: result.assets[0].uri, time: 'Just now', type: 'normal', reactions: {} 
      }]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permissions are required to take photos.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setChatMessages([...chatMessages, { 
        id: Date.now(), user: 'You', text: '', image: result.assets[0].uri, time: 'Just now', type: 'normal', reactions: {} 
      }]);
    }
  };
  
  const sendMessage = () => {
    if (inputText.trim()) {
      setChatMessages([...chatMessages, { id: Date.now(), user: 'You', text: inputText, time: 'Just now', type: 'normal' }]);
      setInputText('');
    }
  };
  
  // Traffic State (LOW, MEDIUM, HIGH)
  const [trafficState, setTrafficState] = useState('MEDIUM');

  // Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let duration = trafficState === 'HIGH' ? 600 : trafficState === 'MEDIUM' ? 1250 : 2000;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: duration, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: duration, useNativeDriver: true })
      ])
    ).start();
  }, [trafficState]);

  // Theme colors
  const theme = {
    bg: isDarkMode ? '#0B0F19' : '#F8F9FA',
    card: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    textMuted: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.10)' : '#E5E7EB',
  };

  const pages = ['Live', 'Heatmap', 'Forecast', 'Impact', 'Community', 'Settings'];

  // getTrafficColor was moved to top of App component

  const getTrafficGlow = (state) => {
    if (state === 'HIGH') return COLORS.redGlow;
    if (state === 'MEDIUM') return COLORS.orangeGlow;
    return COLORS.greenGlow;
  };

  const renderHome = () => (
    <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      
      {/* 1. Real-Time Traffic Congestion Widget */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Real-Time Traffic Congestion</Text>
          <Animated.View style={[
            styles.pulseDot, 
            { backgroundColor: getTrafficColor(trafficState), transform: [{ scale: pulseAnim }], shadowColor: getTrafficColor(trafficState) }
          ]} />
        </View>

        <View style={styles.pillGroup}>
          {['LOW', 'MEDIUM', 'HIGH'].map(level => {
            const isActive = trafficState === level;
            const color = getTrafficColor(level);
            return (
              <TouchableOpacity 
                key={level} 
                onPress={() => setTrafficState(level)}
                style={[
                  styles.statusPill, 
                  isActive ? { backgroundColor: color, shadowColor: color, shadowOpacity: 0.6, shadowRadius: 8, elevation: 5 } : { backgroundColor: 'rgba(255,255,255,0.03)' }
                ]}
              >
                <Text style={[styles.statusPillText, { color: isActive ? '#FFF' : theme.textMuted }]}>
                  {level.charAt(0) + level.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.telemetryBox}>
          <View>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Current Speed</Text>
            <Text style={[styles.telemetryValue, { color: theme.text }]}>
              {trafficState === 'HIGH' ? '12' : trafficState === 'MEDIUM' ? '34' : '65'} <Text style={{fontSize: 16}}>km/h</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Commute Delay</Text>
            <Text style={[styles.telemetryValue, { color: getTrafficColor(trafficState) }]}>
              {trafficState === 'HIGH' ? '+45m' : trafficState === 'MEDIUM' ? '+14m' : 'On Time'}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. CO2 Emission Corridor Tracker */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Live Corridor CO2 Emission</Text>
          <Feather name="cloud-drizzle" size={18} color={COLORS.orange} />
        </View>

        {/* Sleek Horizontal Gauge */}
        <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
          <Text style={[styles.arcValue, { color: theme.text }]}>138 <Text style={{ fontSize: 16, color: theme.textMuted, fontWeight: 'normal' }}>g/km</Text></Text>
          <Text style={[styles.trendText, { color: COLORS.green, marginTop: 5, marginBottom: 15 }]}>-12% less than baseline</Text>
          
          <View style={{ width: '100%', height: 12, borderRadius: 6, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <View style={{ flex: 1, backgroundColor: COLORS.green }} />
            <View style={{ flex: 1, backgroundColor: COLORS.orange }} />
            <View style={{ flex: 1, backgroundColor: COLORS.red }} />
            {/* Indicator marker at ~60% (138 out of 230 max) */}
            <View style={{ position: 'absolute', left: '60%', top: -2, bottom: -2, width: 4, backgroundColor: '#FFF', borderRadius: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.5, shadowRadius: 3, elevation: 3 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Eco Safe</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Elevated</Text>
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>Critical</Text>
          </View>
        </View>

        <View style={styles.ecoTipBanner}>
          <Feather name="info" size={16} color={COLORS.green} style={{ marginTop: 2 }} />
          <Text style={styles.ecoTipText}>
            Delay departure by 15 mins to reduce personal CO2 impact by 28%.
          </Text>
        </View>
      </View>

      {/* 3. 2-Hour Traffic Forecasting */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Traffic Forecast (Next 2 Hours)</Text>
          <Feather name="trending-up" size={18} color={theme.textMuted} />
        </View>

        {/* Mock Spline Chart area */}
        <View style={styles.chartContainer}>
          <View style={styles.chartGuides}>
            <View style={styles.guideLine} />
            <View style={styles.guideLine} />
            <View style={styles.guideLine} />
          </View>
          
          {/* Simulated Area Chart using overlapping views */}
          <View style={styles.chartBars}>
            <View style={[styles.chartBar, { height: '30%', backgroundColor: COLORS.greenGlow }]} />
            <View style={[styles.chartBar, { height: '50%', backgroundColor: COLORS.orangeGlow }]} />
            <View style={[styles.chartBar, { height: '80%', backgroundColor: COLORS.orangeGlow }]} />
            <View style={[styles.chartBar, { height: '100%', backgroundColor: COLORS.redGlow }]} />
            <View style={[styles.chartBar, { height: '90%', backgroundColor: COLORS.redGlow }]} />
            <View style={[styles.chartBar, { height: '60%', backgroundColor: COLORS.orangeGlow }]} />
            <View style={[styles.chartBar, { height: '35%', backgroundColor: COLORS.greenGlow }]} />
          </View>

          <View style={styles.chartLabels}>
            <Text style={styles.chartLabel}>Now</Text>
            <Text style={styles.chartLabel}>+30m</Text>
            <Text style={styles.chartLabel}>+60m</Text>
            <Text style={styles.chartLabel}>+90m</Text>
            <Text style={styles.chartLabel}>+120m</Text>
          </View>
        </View>
      </View>
      
    </ScrollView>
  );

  const renderCommunity = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, flex: 1, marginHorizontal: 8, marginTop: 8, marginBottom: 85, padding: 0 }]}>
        <View style={[styles.cardHeader, { padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 0 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Live Community Updates</Text>
          <Feather name="users" size={18} color={theme.textMuted} />
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {chatMessages.map((msg) => (
            <View key={msg.id} style={{ marginBottom: 15, alignSelf: msg.user === 'You' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, justifyContent: msg.user === 'You' ? 'flex-end' : 'flex-start' }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginRight: 8 }}>{msg.user}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>{msg.time}</Text>
              </View>
              <View style={{ 
                backgroundColor: msg.user === 'You' ? COLORS.green : (msg.type === 'alert' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.1)'), 
                padding: 12, borderRadius: 16, 
                borderWidth: 1, borderColor: msg.type === 'alert' ? COLORS.red : 'transparent' 
              }}>
                {msg.image && <Image source={{ uri: msg.image }} style={{ width: 150, height: 150, borderRadius: 10, marginBottom: msg.text ? 10 : 0 }} />}
                {msg.text ? <Text style={{ color: msg.user === 'You' ? '#000' : theme.text, fontSize: 14 }}>{msg.text}</Text> : null}
              </View>
              {/* Reactions Bar */}
              <View style={{ flexDirection: 'row', marginTop: 6, justifyContent: msg.user === 'You' ? 'flex-end' : 'flex-start', gap: 6 }}>
                {['👍', '⚠️', '❤️', '😱'].map(emoji => {
                  const count = msg.reactions?.[emoji] || 0;
                  return (
                    <TouchableOpacity key={emoji} onPress={() => toggleReaction(msg.id, emoji)} style={{ backgroundColor: count > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: count > 0 ? COLORS.green : 'transparent' }}>
                      <Text style={{ fontSize: 12 }}>{emoji} {count > 0 ? count : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: theme.border, alignItems: 'center' }}>
          <TouchableOpacity onPress={takePhoto} style={{ padding: 10 }}>
            <Feather name="camera" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} style={{ padding: 10, marginRight: 5 }}>
            <Feather name="image" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <TextInput 
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10 }}
            placeholder="Report traffic or reply..."
            placeholderTextColor={theme.textMuted}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={sendMessage} style={{ backgroundColor: COLORS.green, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="send" size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderHeatmap = () => {
    const handleFlagTraffic = async (issueType) => {
      if (!userLocation) {
        alert("We are still pinpointing your GPS location. Please ensure location services are enabled.");
        return;
      }
      
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude, userLocation.longitude,
        currentMapCenter.latitude, currentMapCenter.longitude
      );

      // Restrict flagging to within 5 kilometers of actual GPS
      if (distance > 5) {
        alert(`You can only flag areas within 5 km of your physical location to prevent abuse. This area is ${distance.toFixed(1)} km away!`);
        return;
      }

      const newMarker = {
        id: Date.now(),
        coordinate: { latitude: currentMapCenter.latitude, longitude: currentMapCenter.longitude },
        type: issueType
      };
      setMapMarkers([...mapMarkers, newMarker]);
      
      let locationName = searchQuery;
      if (!locationName) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentMapCenter.latitude}&lon=${currentMapCenter.longitude}`, {
            headers: { 'User-Agent': 'FlowSyncApp/1.0 (hackathon)' }
          });
          const data = await res.json();
          if (data && data.display_name) {
            locationName = data.display_name.split(',').slice(0, 3).join(',');
          } else {
            locationName = "the selected location";
          }
        } catch (e) {
          locationName = "the selected location";
        }
      }

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        user: 'System Alert',
        text: `${currentUser ? currentUser.name : 'A user'} just flagged ${issueType} near ${locationName}.`,
        time: 'Just now',
        type: 'alert',
        reactions: {},
        flaggedBy: currentUser ? currentUser.name : null
      }]);

      alert(`Area flagged for ${issueType}! Notification sent to Community.`);
      setSearchQuery('');
    };

    const handleSelectSuggestion = (item) => {
      setSearchQuery(item.display_name);
      setSearchSuggestions([]);
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          map.flyTo([${item.lat}, ${item.lon}], 15);
          if (window.searchPin) { map.removeLayer(window.searchPin); }
          var searchIcon = L.divIcon({
            className: "custom-pin",
            iconAnchor: [0, 0],
            html: "<span style='background-color: #EF4444; width: 16px; height: 16px; display: block; left: -8px; top: -8px; position: relative; border-radius: 16px; border: 2px solid #FFFFFF; box-shadow: 0px 0px 10px #EF4444;' />"
          });
          window.searchPin = L.marker([${item.lat}, ${item.lon}], {icon: searchIcon}).addTo(map);
          true;
        `);
      }
    };

    const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'User-Agent': 'FlowSyncApp/1.0 (hackathon)'
          }
        });
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          if (webviewRef.current) {
            webviewRef.current.injectJavaScript(`
              map.flyTo([${lat}, ${lon}], 15);
              if (window.searchPin) { map.removeLayer(window.searchPin); }
              var searchIcon = L.divIcon({
                className: "custom-pin",
                iconAnchor: [0, 0],
                html: "<span style='background-color: #EF4444; width: 16px; height: 16px; display: block; left: -8px; top: -8px; position: relative; border-radius: 16px; border: 2px solid #FFFFFF; box-shadow: 0px 0px 10px #EF4444;' />"
              });
              window.searchPin = L.marker([${lat}, ${lon}], {icon: searchIcon}).addTo(map);
              true;
            `);
          }
        } else {
          alert("Location not found.");
        }
      } catch (e) {
        alert("Error searching location.");
      }
    };

    const leafletHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; background: #0B0F19; }
          html, body, #map { height: 100%; width: 100%; }
          .leaflet-control-attribution { display: none !important; }
          .leaflet-control-zoom { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var startLat = ${userLocation ? userLocation.latitude : 37.78825};
          var startLng = ${userLocation ? userLocation.longitude : -122.4324};
          var map = L.map('map', { zoomControl: false }).setView([startLat, startLng], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          ${userLocation ? `
          var userIcon = L.divIcon({
            className: "user-pin",
            iconAnchor: [0, 0],
            html: "<div style='background-color: #3B82F6; width: 16px; height: 16px; border-radius: 8px; border: 3px solid #FFF; box-shadow: 0 0 12px rgba(59, 130, 246, 0.8); position: relative; left: -8px; top: -8px;'></div>"
          });
          window.userPin = L.marker([${userLocation.latitude}, ${userLocation.longitude}], {icon: userIcon, zIndexOffset: 1000}).addTo(map);
          ` : ''}

          map.on('moveend', function() {
            var center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center_changed', lat: center.lat, lng: center.lng }));
          });

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            
            if (window.searchPin) { map.removeLayer(window.searchPin); }
            var searchIcon = L.divIcon({
              className: "custom-pin",
              iconAnchor: [0, 0],
              html: "<span style='background-color: #EF4444; width: 16px; height: 16px; display: block; left: -8px; top: -8px; position: relative; border-radius: 16px; border: 2px solid #FFFFFF; box-shadow: 0px 0px 10px #EF4444;' />"
            });
            window.searchPin = L.marker([lat, lng], {icon: searchIcon}).addTo(map);

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center_changed', lat: lat, lng: lng }));
          });

          window.pins = [];
          window.addPin = function(lat, lng, color) {
            var markerHtmlStyles = 'background-color: ' + color + '; width: 24px; height: 24px; display: block; left: -12px; top: -12px; position: relative; border-radius: 24px; border: 3px solid #FFFFFF; box-shadow: 0px 0px 10px ' + color + ';';
            var icon = L.divIcon({
              className: "custom-pin",
              iconAnchor: [0, 0],
              html: "<span style='" + markerHtmlStyles + "' />"
            });
            var marker = L.marker([lat, lng], {icon: icon}).addTo(map);
            window.pins.push(marker);
          };
        </script>
      </body>
      </html>
    `;

    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, overflow: 'hidden' }}>
        <WebView 
          ref={webviewRef}
          source={{ html: leafletHTML }}
          style={{ flex: 1 }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'center_changed') {
                setCurrentMapCenter({ latitude: data.lat, longitude: data.lng });
              }
            } catch (e) {}
          }}
          onLoadEnd={() => {
            const markersScript = mapMarkers.map(m => 
              `window.addPin(${m.coordinate.latitude}, ${m.coordinate.longitude}, '${getTrafficColor(m.type)}');`
            ).join('');
            webviewRef.current.injectJavaScript(markersScript + " true;");
          }}
        />

        {/* Floating Search Bar */}
        <View style={{ position: 'absolute', top: 20, alignSelf: 'center', width: '90%', flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 }}>
          <Feather name="search" size={20} color={theme.textMuted} style={{ marginLeft: 10 }} />
          <TextInput 
            style={{ flex: 1, marginLeft: 12, color: '#FFF', fontSize: 16 }}
            placeholder="Search road or area (Press Enter)..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        {/* Suggestions Dropdown */}
        {searchSuggestions.length > 0 && (
          <View style={{ position: 'absolute', top: 70, alignSelf: 'center', width: '90%', backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', zIndex: 1000, shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 15, elevation: 20 }}>
            {searchSuggestions.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => handleSelectSuggestion(item)}
                style={{ padding: 15, borderBottomWidth: index < searchSuggestions.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.1)' }}
              >
                <Text style={{ color: '#FFF', fontSize: 14 }} numberOfLines={2}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Floating Action Buttons for Flagging */}
        <View style={{ position: 'absolute', bottom: 30, right: 20, flexDirection: 'column', zIndex: 1000, elevation: 10, alignItems: 'center' }}>
          
          <TouchableOpacity onPress={() => handleFlagTraffic('Traffic')} style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.red, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 5, elevation: 8, marginBottom: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
              <MaterialCommunityIcons name="car-brake-alert" size={26} color="#FFF" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }}>Traffic</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => handleFlagTraffic('Blockage')} style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.orange, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 5, elevation: 8, marginBottom: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
              <MaterialCommunityIcons name="alert-octagon" size={26} color="#FFF" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }}>Blockage</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleFlagTraffic('Work')} style={{ alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#EAB308', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 5, elevation: 8, marginBottom: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }}>
              <MaterialCommunityIcons name="traffic-cone" size={26} color="#FFF" />
            </View>
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }}>Work</Text>
          </TouchableOpacity>

        </View>
      </View>
    );
  };

  const renderProfile = () => {
    if (!currentUser) return null;
    
    const myAlerts = chatMessages.filter(msg => msg.user === currentUser.name || msg.flaggedBy === currentUser.name);

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, flex: 1, marginHorizontal: 8, marginTop: 8, marginBottom: 85, padding: 20 }]}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Image source={{ uri: currentUser.avatar }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 10, borderWidth: 3, borderColor: COLORS.green }} />
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>{currentUser.name}</Text>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Account Details</Text>
                {!isEditingProfile ? (
                  <TouchableOpacity onPress={() => { setEditPhone(userProfile.phone); setEditDob(userProfile.dob); setIsEditingProfile(true); }}>
                    <Text style={{ color: COLORS.green }}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => { setUserProfile({ phone: editPhone, dob: editDob }); setIsEditingProfile(false); }}>
                    <Text style={{ color: COLORS.green, fontWeight: 'bold' }}>Save</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 5 }}>Phone Number</Text>
                {isEditingProfile ? (
                  <TextInput style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.border }} value={editPhone} onChangeText={setEditPhone} placeholder="+1 555-0000" placeholderTextColor={theme.textMuted} keyboardType="phone-pad" />
                ) : (
                  <Text style={{ color: theme.text, fontSize: 16 }}>{userProfile.phone}</Text>
                )}
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 5 }}>Date of Birth</Text>
                {isEditingProfile ? (
                  <TextInput style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.border }} value={editDob} onChangeText={setEditDob} placeholder="MM/DD/YYYY" placeholderTextColor={theme.textMuted} />
                ) : (
                  <Text style={{ color: theme.text, fontSize: 16 }}>{userProfile.dob}</Text>
                )}
              </View>
            </View>

            <View>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>My Recent Alerts</Text>
              {myAlerts.length > 0 ? myAlerts.map(alert => (
                <View key={alert.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{alert.text}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 5 }}>{alert.time}</Text>
                </View>
              )) : (
                <Text style={{ color: theme.textMuted, fontStyle: 'italic' }}>No alerts flagged yet.</Text>
              )}
            </View>
            
            <TouchableOpacity 
              style={{ marginTop: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              onPress={() => { setCurrentUser(null); setActivePage('tab_live_map'); }}
            >
              <Text style={{ color: COLORS.red, fontWeight: 'bold' }}>Log Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  const renderCongestionSheet = () => (
    <View style={{ position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: 'rgba(11, 15, 25, 0.95)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}>
      <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Intersection Traffic Telemetry</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Feather name="bar-chart-2" size={24} color={COLORS.red} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{metrics.observation.vehicle_count} Vehicles Detected</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Corridor operating at {(metrics.observation.vehicle_density).toFixed(0)}% capacity. Delay spike imminent.</Text>
        </View>
        <View style={{ backgroundColor: COLORS.redGlow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.red }}>
          <Text style={{ color: COLORS.red, fontSize: 10, fontWeight: 'bold' }}>HEAVY TRAFFIC</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
        {['Low', 'Medium', 'High'].map(level => (
          <View key={level} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: level === 'High' ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: 8 }}>
            <Text style={{ color: level === 'High' ? theme.text : theme.textMuted, fontWeight: level === 'High' ? 'bold' : 'normal' }}>{level}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSignalsSheet = () => (
    <View style={{ position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: 'rgba(11, 15, 25, 0.95)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}>
      <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Adaptive Signal Timing Model</Text>
      <View style={{ backgroundColor: COLORS.greenGlow, padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.green }}>
        <Text style={{ color: COLORS.green, fontSize: 18, fontWeight: 'bold' }}>Delay Reduced by {metrics.optimized.delay_reduction.toFixed(2)}s (-{((metrics.optimized.delay_reduction / metrics.baseline.delay) * 100).toFixed(1)}%)</Text>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 8 }}>
          <Text style={{ color: theme.textMuted, flex: 2 }}>Lane</Text>
          <Text style={{ color: theme.textMuted, flex: 1, textAlign: 'center' }}>Base</Text>
          <Text style={{ color: theme.textMuted, flex: 1, textAlign: 'center' }}>Opt</Text>
          <Text style={{ color: theme.textMuted, flex: 1.5, textAlign: 'right' }}>Delta</Text>
        </View>
        {[
          { lane: 'North-South Green', base: `${metrics.baseline.north_south_green}s`, opt: `${metrics.optimized.north_south_green}s`, delta: `${metrics.optimized.north_south_green > metrics.baseline.north_south_green ? '+' : ''}${(metrics.optimized.north_south_green - metrics.baseline.north_south_green).toFixed(0)}s`, deltaColor: metrics.optimized.north_south_green > metrics.baseline.north_south_green ? COLORS.green : COLORS.orange },
          { lane: 'East-West Green', base: `${metrics.baseline.east_west_green}s`, opt: `${metrics.optimized.east_west_green}s`, delta: `${metrics.optimized.east_west_green > metrics.baseline.east_west_green ? '+' : ''}${(metrics.optimized.east_west_green - metrics.baseline.east_west_green).toFixed(0)}s`, deltaColor: metrics.optimized.east_west_green > metrics.baseline.east_west_green ? COLORS.green : COLORS.orange },
          { lane: 'Total Delay Cycle', base: `${metrics.baseline.delay.toFixed(2)}s`, opt: `${metrics.optimized.delay.toFixed(2)}s`, delta: `-${metrics.optimized.delay_reduction.toFixed(2)}s`, deltaColor: COLORS.green },
        ].map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: theme.text, flex: 2 }}>{row.lane}</Text>
            <Text style={{ color: theme.text, flex: 1, textAlign: 'center' }}>{row.base}</Text>
            <Text style={{ color: theme.text, flex: 1, textAlign: 'center' }}>{row.opt}</Text>
            <Text style={{ color: row.deltaColor, flex: 1.5, textAlign: 'right', fontWeight: 'bold' }}>{row.delta}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderEcoSheet = () => (
    <View style={{ position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: 'rgba(11, 15, 25, 0.95)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 }}>
      <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Green Mobility & Savings</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Feather name="wind" size={24} color={COLORS.green} style={{ marginBottom: 8 }} />
          <Text style={{ color: COLORS.green, fontSize: 14, fontWeight: 'bold' }}>{(metrics.impact.co2_saved_kg).toFixed(4)} kg</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 4 }}>CO2 Offset</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Feather name="droplet" size={24} color={COLORS.green} style={{ marginBottom: 8 }} />
          <Text style={{ color: COLORS.green, fontSize: 14, fontWeight: 'bold' }}>{(metrics.impact.fuel_saved_liters).toFixed(4)} L</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 4 }}>Fuel Saved</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Feather name="clock" size={24} color={COLORS.orange} style={{ marginBottom: 8 }} />
          <Text style={{ color: COLORS.orange, fontSize: 14, fontWeight: 'bold' }}>{(metrics.impact.vehicle_hours_saved).toFixed(3)} hrs</Text>
          <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 4 }}>Regained</Text>
        </View>
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
        <Text style={{ color: theme.text, fontSize: 12, lineHeight: 18, fontStyle: 'italic', textAlign: 'center' }}>
          "Signal timing optimization prevented {(metrics.impact.co2_saved_kg).toFixed(3)}kg of idling carbon emissions on this cycle."
        </Text>
      </View>
    </View>
  );

  const renderActivePage = () => {
    // Empty, not used anymore
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Top App Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('./assets/logo.jpg')} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="cover" />
          <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 12, marginBottom: 2 }]}>FlowSync</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            onPress={() => {
              if (currentUser) setActivePage('nav_profile');
              else setIsLoginModalVisible(true);
            }} 
            style={[styles.themeToggle, { borderColor: theme.border }]}
          >
            {currentUser ? (
              <Image source={{ uri: currentUser.avatar }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <Feather name="user" size={18} color={theme.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)} style={[styles.themeToggle, { borderColor: theme.border }]}>
            <Feather name={isDarkMode ? "sun" : "moon"} size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {(activePage === 'tab_live_map' || activePage === 'tab_congestion' || activePage === 'tab_signals' || activePage === 'tab_eco_impact') && renderHeatmap()}
      {activePage === 'tab_community' && renderCommunity()}
      {activePage === 'nav_profile' && renderProfile()}

      {activePage === 'tab_congestion' && renderCongestionSheet()}
      {activePage === 'tab_signals' && renderSignalsSheet()}
      {activePage === 'tab_eco_impact' && renderEcoSheet()}

      {/* Modernized Floating Bottom Navigation */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNav}>
          {[
            { id: 'tab_live_map', icon: 'map', label: 'Live' },
            { id: 'tab_congestion', icon: 'activity', label: 'Congestion' },
            { id: 'tab_signals', icon: 'sliders', label: 'Signals' },
            { id: 'tab_eco_impact', icon: 'wind', label: 'Impact' },
            { id: 'tab_community', icon: 'message-square', label: 'Community' },
          ].map(item => {
            const isActive = activePage === item.id;
            return (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => setActivePage(item.id)}
                style={styles.navItem}
              >
                <Feather 
                  name={item.icon} 
                  size={20} 
                  color={isActive ? COLORS.green : '#A1A1AA'} 
                />
                <Text style={[styles.navItemText, { color: isActive ? COLORS.green : '#A1A1AA' }]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.navActiveIndicator} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Simple Sidebar Menu Modal */}
      <Modal visible={isMenuOpen} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.menuDrawer, { backgroundColor: theme.bg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Menu</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {pages.map(p => (
              <TouchableOpacity key={p} style={{ paddingVertical: 15 }}>
                <Text style={{ fontSize: 18, color: theme.text }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Auth Modal */}
      <Modal visible={isLoginModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 }}>
              <View style={{ width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
              
              <Text style={{ color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 5 }}>
                {authMode === 'login' ? 'Welcome Back' : 'Join FlowSync'}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 14, marginBottom: 25 }}>
                {authMode === 'login' ? 'Sign in to report live traffic conditions.' : 'Create an account and get your custom Bitmoji avatar.'}
              </Text>
              
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: theme.border }}
                placeholder="Username"
                placeholderTextColor={theme.textMuted}
                value={authUsername}
                onChangeText={setAuthUsername}
                autoCapitalize="none"
              />
              
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: theme.text, borderRadius: 12, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: theme.border }}
                placeholder="Password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
              />
              
              <TouchableOpacity 
                style={{ backgroundColor: COLORS.green, paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginBottom: 15 }}
                onPress={() => {
                  if (!authUsername.trim() || !authPassword.trim()) {
                    alert('Please enter both username and password.');
                    return;
                  }
                  // Generate custom Bitmoji-style avatar using DiceBear
                  const seed = encodeURIComponent(authUsername.trim());
                  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/png?seed=${seed}&backgroundColor=b6e3f4`;
                  
                  setCurrentUser({ name: authUsername.trim(), avatar: avatarUrl });
                  setAuthUsername('');
                  setAuthPassword('');
                  setIsLoginModalVisible(false);
                  alert(`Successfully ${authMode === 'login' ? 'logged in' : 'registered'} as ${authUsername}!`);
                }}
              >
                <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>{authMode === 'login' ? 'Log In' : 'Register'}</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
                <Text style={{ color: theme.textMuted }}>{authMode === 'login' ? "Don't have an account?" : "Already have an account?"}</Text>
                <TouchableOpacity onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                  <Text style={{ color: COLORS.green, fontWeight: 'bold' }}>{authMode === 'login' ? 'Register' : 'Log In'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setIsLoginModalVisible(false)} style={{ alignItems: 'center', marginTop: 25 }}>
                <Text style={{ color: theme.textMuted, fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, zIndex: 10
  },
  menuBtn: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5 },
  themeToggle: { 
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, 
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)'
  },
  content: { flex: 1 },
  
  card: {
    borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1,
    overflow: 'hidden'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  
  pulseDot: {
    width: 12, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.8
  },

  pillGroup: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusPill: { 
    flex: 1, paddingVertical: 10, borderRadius: 20, 
    alignItems: 'center', justifyContent: 'center'
  },
  statusPillText: { fontSize: 13, fontWeight: '600' },

  telemetryBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 16 },
  telemetryValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },

  arcValue: { fontSize: 36, fontWeight: 'bold' },
  trendText: { textAlign: 'center', fontSize: 13, fontWeight: '600' },

  ecoTipBanner: { 
    flexDirection: 'row', backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    padding: 12, borderRadius: 12, gap: 10 
  },
  ecoTipText: { flex: 1, color: COLORS.green, fontSize: 13, lineHeight: 18 },

  chartContainer: { height: 160, marginTop: 10 },
  chartGuides: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingBottom: 30 },
  guideLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, paddingHorizontal: 10 },
  chartBar: { width: '10%', borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.8 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  chartLabel: { color: '#6B7280', fontSize: 11 },

  bottomNavWrapper: { position: 'absolute', bottom: 16, left: 20, right: 20, alignItems: 'center' },
  bottomNav: { 
    flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.88)', 
    borderRadius: 32, paddingHorizontal: 18, paddingVertical: 12, 
    justifyContent: 'space-between', width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 32, elevation: 10
  },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navItemText: { fontSize: 10, marginTop: 4, fontWeight: '500' },
  navActiveIndicator: { 
    position: 'absolute', bottom: -12, width: 20, height: 4, 
    backgroundColor: COLORS.green, borderRadius: 2,
    shadowColor: COLORS.green, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.8, shadowRadius: 6
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-start' },
  menuDrawer: { width: width * 0.75, height: '100%', padding: 20, paddingTop: 60, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
});
