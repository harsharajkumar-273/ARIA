import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image
} from 'react-native';

const { width } = Dimensions.get('window');

// 14 Crisis Needs Categories
const NEED_CATEGORIES = [
  { id: 'food', label: 'Food / Meals', icon: '🍲', color: '#10B981' },
  { id: 'water', label: 'Fresh Water', icon: '💧', color: '#3B82F6' },
  { id: 'shelter', label: 'Emergency Shelter', icon: '🏠', color: '#8B5CF6' },
  { id: 'warmth', label: 'Blankets / Heat', icon: '🔥', color: '#EF4444' },
  { id: 'medicine', label: 'Prescriptions', icon: '💊', color: '#F59E0B' },
  { id: 'medical_attention', label: 'First Aid', icon: '🩹', color: '#EF4444' },
  { id: 'transport', label: 'Emergency Ride', icon: '🚗', color: '#EC4899' },
  { id: 'power', label: 'Device Charging', icon: '🔌', color: '#F59E0B' },
  { id: 'clothing', label: 'Clothing', icon: '👕', color: '#10B981' },
  { id: 'childcare', label: 'Childcare', icon: '👶', color: '#3B82F6' }
];

export default function App() {
  // Navigation stack state simulator
  const [currentScreen, setCurrentScreen] = useState<'Onboarding' | 'RoleSelect' | 'PhoneVerify' | 'CitizenHome' | 'ResponderHome' | 'HelperHome'>('Onboarding');
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'responder' | 'helper' | 'volunteer' | null>(null);
  
  // Auth Form State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Active User / Handoff State
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);

  // -------------------------------------------------------------
  // ONBOARDING SCREEN (3 Slides)
  // -------------------------------------------------------------
  const onboardingSlides = [
    {
      title: 'ARIA Coordination',
      desc: 'A unified disaster response platform linking citizens, volunteers, and emergency crews during crisis events.',
      icon: '🛡️'
    },
    {
      title: 'Safe Pathfinding',
      desc: 'Routing powered by live crowd hazard reports and circuit outage predictions to navigate around danger zones.',
      icon: '🗺️'
    },
    {
      title: 'SMS Coordination',
      desc: 'Access emergency aid, dispatch crews, and confirm dropoffs without installing an app - works entirely over text.',
      icon: '💬'
    }
  ];

  const renderOnboarding = () => (
    <View style={styles.container}>
      <View style={styles.slideContainer}>
        <Text style={styles.slideIcon}>{onboardingSlides[onboardingIndex].icon}</Text>
        <Text style={styles.slideTitle}>{onboardingSlides[onboardingIndex].title}</Text>
        <Text style={styles.slideDesc}>{onboardingSlides[onboardingIndex].desc}</Text>
      </View>
      <View style={styles.dotsContainer}>
        {onboardingSlides.map((_, i) => (
          <View key={i} style={[styles.dot, onboardingIndex === i && styles.activeDot]} />
        ))}
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          if (onboardingIndex < 2) {
            setOnboardingIndex(onboardingIndex + 1);
          } else {
            setCurrentScreen('RoleSelect');
          }
        }}
      >
        <Text style={styles.buttonText}>{onboardingIndex < 2 ? 'Next' : 'Get Started'}</Text>
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------
  // ROLE SELECTION
  // -------------------------------------------------------------
  const renderRoleSelect = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Role</Text>
      <Text style={styles.subtitle}>Help us customize your disaster response dashboard.</Text>

      <View style={styles.roleGrid}>
        {(['citizen', 'helper', 'volunteer', 'responder'] as const).map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleCard, selectedRole === role && styles.roleCardActive]}
            onPress={() => setSelectedRole(role)}
          >
            <Text style={styles.roleIcon}>
              {role === 'citizen' ? '🙋' : role === 'helper' ? '🤝' : role === 'volunteer' ? '🚗' : '👷'}
            </Text>
            <Text style={styles.roleLabel}>{role.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, !selectedRole && styles.buttonDisabled]}
        disabled={!selectedRole}
        onPress={() => setCurrentScreen('PhoneVerify')}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------
  // PHONE VERIFICATION (Simulated Twilio OTP)
  // -------------------------------------------------------------
  const renderPhoneVerify = () => (
    <View style={styles.container}>
      <Text style={styles.title}>{otpSent ? 'Enter Code' : 'Verify Phone'}</Text>
      <Text style={styles.subtitle}>
        {otpSent ? `We sent a 4-digit code to ${phone}` : 'Enter your mobile number to connect to ARIA.'}
      </Text>

      {!otpSent ? (
        <View style={styles.inputContainer}>
          <Text style={styles.inputPrefix}>🇺🇸 +1</Text>
          <TextInput
            placeholder="555-000-0000"
            placeholderTextColor="#4B5563"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.textInput}
          />
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="0 0 0 0"
            placeholderTextColor="#4B5563"
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
            style={[styles.textInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          if (!otpSent) {
            setOtpSent(true);
          } else {
            // Direct mock logins based on selected roles
            if (selectedRole === 'citizen') setCurrentScreen('CitizenHome');
            else if (selectedRole === 'responder') setCurrentScreen('ResponderHome');
            else setCurrentScreen('HelperHome');
          }
        }}
      >
        <Text style={styles.buttonText}>{otpSent ? 'Verify' : 'Send Code'}</Text>
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------
  // CITIZEN DASHBOARD
  // -------------------------------------------------------------
  const handleRequestSubmit = (category: string) => {
    setActiveRequest({ id: 'req_1', category, status: 'open' });
    
    // Simulate auto-matching in 3 seconds
    setTimeout(() => {
      setActiveMatch({
        id: 'match_1',
        need: category,
        helperName: 'Red Cross Nashville',
        volunteerName: 'James T.',
        eta: '25 mins',
        pin: '4821',
        status: 'en_route'
      });
    }, 3000);
  };

  const renderCitizenHome = () => (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ARIA Citizen</Text>
          <Text style={styles.headerTag}>📍 NASHVILLE SAFE ZONE</Text>
        </View>

        {activeMatch ? (
          <View style={styles.matchCard}>
            <Text style={styles.matchBadge}>🚨 DRIVER EN ROUTE</Text>
            <Text style={styles.matchText}>
              {activeMatch.volunteerName} is delivering {NEED_CATEGORIES.find(c => c.id === activeMatch.need)?.label} from {activeMatch.helperName}.
            </Text>
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>YOUR SECURE CONFIRMATION PIN</Text>
              <Text style={styles.pinCode}>{activeMatch.pin}</Text>
              <Text style={styles.pinSub}>Provide this to the driver upon delivery.</Text>
            </View>
            <View style={styles.matchMeta}>
              <Text style={styles.matchMetaText}>ETA: {activeMatch.eta}</Text>
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setActiveMatch(null); setActiveRequest(null); }}>
              <Text style={styles.cancelBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        ) : activeRequest ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>🔍 Finding Nearest Match...</Text>
            <Text style={styles.alertDesc}>
              Searching for available helpers with {NEED_CATEGORIES.find(c => c.id === activeRequest.category)?.label} in Nashville.
            </Text>
          </View>
        ) : (
          <View style={styles.gridSection}>
            <Text style={styles.sectionTitle}>What do you need?</Text>
            <View style={styles.grid}>
              {NEED_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.gridCard, { borderLeftColor: cat.color, borderLeftWidth: 4 }]}
                  onPress={() => handleRequestSubmit(cat.id)}
                >
                  <Text style={styles.gridIcon}>{cat.icon}</Text>
                  <Text style={styles.gridLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // -------------------------------------------------------------
  // RESPONDER / CREWIQ DASHBOARD
  // -------------------------------------------------------------
  const [jobStatus, setJobStatus] = useState<'pending' | 'in_progress' | 'complete'>('pending');

  const renderResponderHome = () => (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CrewIQ Dispatch</Text>
          <Text style={styles.headerTag}>👷 NES ELECTRICAL TEAM 1</Text>
        </View>

        <View style={styles.jobCard}>
          <View style={styles.jobHeader}>
            <Text style={styles.jobTitle}>Circ 4A - Downtown Outage</Text>
            <Text style={styles.jobPriority}>PRIORITY 92%</Text>
          </View>
          <Text style={styles.jobDesc}>
            Sequenced repairs: Electrical grid line restoration required. Tree Alpha crew has cleared blocking limbs.
          </Text>

          {jobStatus === 'pending' && (
            <TouchableOpacity style={styles.acceptBtn} onPress={() => setJobStatus('in_progress')}>
              <Text style={styles.acceptBtnText}>Accept Job Dispatch</Text>
            </TouchableOpacity>
          )}

          {jobStatus === 'in_progress' && (
            <View>
              <View style={styles.statusSection}>
                <Text style={styles.statusText}>🚙 En Route to Circuit Junction (45m)</Text>
              </View>
              <TouchableOpacity style={styles.doneBtn} onPress={() => setJobStatus('complete')}>
                <Text style={styles.doneBtnText}>Mark Repairs Complete</Text>
              </TouchableOpacity>
            </View>
          )}

          {jobStatus === 'complete' && (
            <View style={styles.successSection}>
              <Text style={styles.successText}>✅ Electrical Grid Restored! Circuit Online.</Text>
              <TouchableOpacity style={styles.resetJobBtn} onPress={() => setJobStatus('pending')}>
                <Text style={styles.resetJobBtnText}>Reset Task Demo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // -------------------------------------------------------------
  // HELPER DASHBOARD
  // -------------------------------------------------------------
  const renderHelperHome = () => (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Helper Portal</Text>
          <Text style={styles.headerTag}>🤝 COMMUNITY DONOR</Text>
        </View>

        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Aid Footprint</Text>
          <Text style={styles.impactValue}>14</Text>
          <Text style={styles.impactLabel}>CITIZENS HELPED DURING CRISIS</Text>
        </View>

        <Text style={styles.sectionTitle}>Active Contributions</Text>
        <View style={styles.donationCard}>
          <Text style={styles.donationTitle}>Surplus Meals - Food Bank</Text>
          <Text style={styles.donationDesc}>25 portions hot chicken and rice packaged and ready for volunteer pickup.</Text>
          <Text style={styles.donationStatus}>🚚 MATCHED - VOLUNTEER EN ROUTE</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Navigation switcher
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      {currentScreen === 'Onboarding' && renderOnboarding()}
      {currentScreen === 'RoleSelect' && renderRoleSelect()}
      {currentScreen === 'PhoneVerify' && renderPhoneVerify()}
      {currentScreen === 'CitizenHome' && renderCitizenHome()}
      {currentScreen === 'ResponderHome' && renderResponderHome()}
      {currentScreen === 'HelperHome' && renderHelperHome()}
    </>
  );
}

// -------------------------------------------------------------
// DARK METROPOLIS DESIGN STYLES
// -------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B0F19'
  },
  scrollContainer: {
    padding: 20
  },
  slideContainer: {
    alignItems: 'center',
    marginVertical: 40
  },
  slideIcon: {
    fontSize: 72,
    marginBottom: 20
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5
  },
  slideDesc: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
    marginHorizontal: 4
  },
  activeDot: {
    backgroundColor: '#8B5CF6',
    width: 20
  },
  button: {
    width: '100%',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40
  },
  roleCard: {
    width: '47%',
    aspectRatio: 1.1,
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  roleCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)'
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  roleLabel: {
    color: '#F3F4F6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 40,
    height: 56
  },
  inputPrefix: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 14
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900'
  },
  headerTag: {
    color: '#8B5CF6',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  gridSection: {
    width: '100%'
  },
  sectionTitle: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gridCard: {
    width: '48%',
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)'
  },
  gridIcon: {
    fontSize: 20,
    marginRight: 12
  },
  gridLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center'
  },
  alertTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8
  },
  alertDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18
  },
  matchCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center'
  },
  matchBadge: {
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  pinSection: {
    backgroundColor: '#0B0F19',
    width: '100%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 20
  },
  pinLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10
  },
  pinCode: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 10
  },
  pinSub: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center'
  },
  matchMeta: {
    marginBottom: 20
  },
  matchMetaText: {
    color: '#F3F4F6',
    fontWeight: 'bold',
    fontSize: 13
  },
  cancelBtn: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center'
  },
  cancelBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13
  },
  jobCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
    marginBottom: 12
  },
  jobTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  jobPriority: {
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden'
  },
  jobDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20
  },
  acceptBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  statusSection: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  statusText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 13
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },
  successSection: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  successText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 12
  },
  resetJobBtn: {
    paddingVertical: 4
  },
  resetJobBtnText: {
    color: '#6B7280',
    fontSize: 11
  },
  impactCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30
  },
  impactTitle: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12
  },
  impactValue: {
    color: '#FFFFFF',
    fontSize: 54,
    fontWeight: '900',
    marginBottom: 8
  },
  impactLabel: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1
  },
  donationCard: {
    backgroundColor: 'rgba(31, 41, 55, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16
  },
  donationTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6
  },
  donationDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12
  },
  donationStatus: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});
