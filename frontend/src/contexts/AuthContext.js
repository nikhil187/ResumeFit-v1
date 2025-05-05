import React, { useContext, useState, useEffect, createContext } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  deleteUser,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  RecaptchaVerifier 
} from 'firebase/auth';
import { authenticator } from 'otplib';
import { auth } from '../services/firebase';

// Key for storing 2FA secrets in localStorage
const TWO_FACTOR_SECRET_KEY = 'twoFactorSecret';
const PENDING_LOGIN_EMAIL_KEY = 'pendingLoginEmail';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [multiFactorError, setMultiFactorError] = useState(null);
  const [resolver, setResolver] = useState(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [pendingLoginEmail, setPendingLoginEmail] = useState(null);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    try {
      console.log('Login function called with email:', email);
      
      // Store email in state for 2FA verification
      setPendingLoginEmail(email);
      localStorage.setItem(PENDING_LOGIN_EMAIL_KEY, email);
      
      // Check if 2FA is enabled for this user
      if (isTwoFactorEnabled(email)) {
        console.log('2FA is enabled for this user');
        
        // First verify credentials with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // If 2FA is enabled, don't complete the login process yet
        // The 2FA verification component will handle that
        return { 
          requiresTwoFactor: true,
          user: userCredential.user
        };
      }
      
      // Normal login flow if 2FA is not enabled
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        console.log('User email not verified:', userCredential.user.email);
      } else {
        console.log('User email is verified');
      }
      
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  function getEnrolledFactors() {
    if (!auth.currentUser) return [];
    
    const multiFactorUser = multiFactor(auth.currentUser);
    return multiFactorUser.enrolledFactors;
  }

  function clearMultiFactorError() {
    setMultiFactorError(null);
    setResolver(null);
  }

  async function enrollPhoneMFA(phoneNumber, recaptchaVerifier) {
    if (!auth.currentUser) throw new Error("No user logged in");

    const multiFactorUser = multiFactor(auth.currentUser);
    
    // Get the multi-factor session
    const multiFactorSession = await multiFactorUser.getSession();
    
    // Configure phone auth options
    const phoneInfoOptions = {
      phoneNumber: phoneNumber,
      session: multiFactorSession
    };
    
    // Create phone auth provider
    const phoneAuthProvider = new PhoneAuthProvider(auth);
    
    // Send SMS verification code
    try {
      let verificationId;
      // If we have a recaptcha verifier, use it
      if (recaptchaVerifier) {
        verificationId = await phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions, 
          recaptchaVerifier
        );
      } else {
        // For development, create a dummy verifier that implements the needed methods
        const dummyVerifier = {
          type: "recaptcha",
          verify: () => Promise.resolve("dummy-token"),
          clear: () => {},
          render: () => Promise.resolve(),
          reset: () => {},
          _reset: () => {}
        };
        
        verificationId = await phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions,
          dummyVerifier
        );
      }
      return verificationId;
    } catch (error) {
      console.error("Error verifying phone for MFA enrollment:", error);
      throw error;
    }
  }

  async function verifyPhoneMFACode(sessionId, verificationCode) {
    if (!auth.currentUser) throw new Error("No user logged in");

    const multiFactorUser = multiFactor(auth.currentUser);
    const phoneAuthCredential = PhoneAuthProvider.credential(sessionId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
    
    // Enroll the phone as a second factor
    await multiFactorUser.enroll(multiFactorAssertion, "Phone number");
    return true;
  }

  async function completeMultiFactorSignIn(verificationCode) {
    if (!resolver) throw new Error("No MFA resolver available");

    try {
      const phoneAuthCredential = PhoneAuthProvider.credential(
        resolver.hints[0].uid, 
        verificationCode
      );
      
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
      
      // Complete sign-in
      const userCredential = await resolver.resolveSignIn(multiFactorAssertion);
      
      // Clear the MFA error and resolver
      clearMultiFactorError();
      
      return userCredential;
    } catch (error) {
      console.error("Error completing MFA sign-in:", error);
      throw error;
    }
  }

  async function verifyPhoneForMFA(phoneNumber, recaptchaVerifier) {
    if (!resolver) throw new Error("No MFA resolver available");

    try {
      const phoneInfoOptions = {
        multiFactorHint: resolver.hints[0],
        session: resolver.session
      };
      
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      let verificationId;
      
      // If we have a recaptcha verifier, use it
      if (recaptchaVerifier) {
        verificationId = await phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions, 
          recaptchaVerifier
        );
      } else {
        // For development, we'll use a simple approach
        // This method is NOT recommended for production
        verificationId = await phoneAuthProvider.verifyPhoneNumber(
          phoneInfoOptions,
          { verify: () => Promise.resolve() }
        );
      }
      
      return verificationId;
    } catch (error) {
      console.error("Error verifying phone for MFA:", error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function signInWithGithub() {
    const provider = new GithubAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function updateUserProfile(displayName, photoURL = null) {
    // Ensure displayName is a string
    if (displayName === null || displayName === undefined) {
      displayName = '';
    }
    
    // Convert to string if it's not already
    if (typeof displayName !== 'string') {
      console.warn('Display name is not a string, converting to string:', displayName);
      displayName = String(displayName);
    }
    
    const profileUpdates = { displayName };
    
    // Add photoURL to updates if provided
    if (photoURL !== null) {
      profileUpdates.photoURL = photoURL;
    }
    
    console.log('Updating profile:', profileUpdates);
    return updateProfile(auth.currentUser, profileUpdates)
      .then(() => {
        // After updating profile, refresh the user to ensure changes are reflected immediately
        return refreshUserProfile();
      });
  }

  // Function to refresh user data to ensure changes are reflected
  function refreshUserProfile() {
    if (!auth.currentUser) return Promise.resolve();
    
    return auth.currentUser.reload()
      .then(() => {
        // Update currentUser state with fresh data
        setCurrentUser({...auth.currentUser});
        return auth.currentUser;
      })
      .catch(error => {
        console.error('Error refreshing user profile:', error);
        throw error;
      });
  }

  async function sendEmailVerification() {
    console.log('sendEmailVerification called');
    console.log('Current user:', auth.currentUser);
    
    if (!auth.currentUser) {
      console.error('Error: No user is currently logged in when trying to send verification email');
      throw new Error("No user is currently logged in.");
    }

    const actionCodeSettings = {
      url: 'https://resumefit-app.web.app/profile',
      handleCodeInApp: true
    };

    try {
      console.log('Sending verification email to:', auth.currentUser.email);
      await firebaseSendEmailVerification(auth.currentUser, actionCodeSettings);
      setEmailVerificationSent(true);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  }

  function isEmailVerified() {
    if (!auth.currentUser) {
      return false;
    }
    
    return auth.currentUser.emailVerified || false;
  }

  async function sendEmailOTP(email) {
    const actionCodeSettings = {
      url: 'https://resumefit-app.web.app/login',
      handleCodeInApp: true
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      return true;
    } catch (error) {
      console.error("Error sending email link:", error);
      throw error;
    }
  }

  async function verifyEmailLink(email, link) {
    try {
      const result = await signInWithEmailLink(auth, email, link);
      window.localStorage.removeItem('emailForSignIn');
      return result;
    } catch (error) {
      console.error("Error verifying email link:", error);
      throw error;
    }
  }

  async function resetPassword(email) {
    const actionCodeSettings = {
      url: 'https://resumefit-app.web.app/login',
      handleCodeInApp: false
    };
    
    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  async function checkEmailExists(email) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error) {
      console.error("Error checking if email exists:", error);
      throw error;
    }
  }

  async function deleteAccount() {
    if (!auth.currentUser) {
      throw new Error("No user is currently logged in.");
    }

    try {
      // If 2FA is enabled, disable it first
      if (isTwoFactorEnabled()) {
        await disableTwoFactorAuth();
      }
      
      // Add any cleanup of user data here
      await deleteUser(auth.currentUser);
      return true;
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }

  // 2FA Functions

  // Setup 2FA for the current user
  async function setupTwoFactorAuth(secret) {
    if (!currentUser) {
      throw new Error("You must be logged in to set up 2FA");
    }
    
    try {
      // In a production app, this secret should be stored in a secure database
      // with server-side encryption, but for this demo we'll use localStorage
      const twoFactorData = {
        secret: secret,
        email: currentUser.email,
        enabled: true,
        userId: currentUser.uid
      };
      
      // Save to localStorage (encrypted in a real app)
      const existingData = JSON.parse(localStorage.getItem(TWO_FACTOR_SECRET_KEY) || '{}');
      existingData[currentUser.email] = twoFactorData;
      localStorage.setItem(TWO_FACTOR_SECRET_KEY, JSON.stringify(existingData));
      
      console.log('Two-factor authentication set up for:', currentUser.email);
      return true;
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw error;
    }
  }

  // Disable 2FA for the current user
  async function disableTwoFactorAuth() {
    if (!currentUser) {
      throw new Error("You must be logged in to disable 2FA");
    }
    
    try {
      // Remove from localStorage
      const existingData = JSON.parse(localStorage.getItem(TWO_FACTOR_SECRET_KEY) || '{}');
      if (existingData[currentUser.email]) {
        delete existingData[currentUser.email];
        localStorage.setItem(TWO_FACTOR_SECRET_KEY, JSON.stringify(existingData));
      }
      
      console.log('Two-factor authentication disabled for:', currentUser.email);
      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  // Check if 2FA is enabled for an email
  function isTwoFactorEnabled(email) {
    if (!email) {
      email = currentUser?.email;
    }
    
    if (!email) return false;
    
    try {
      const existingData = JSON.parse(localStorage.getItem(TWO_FACTOR_SECRET_KEY) || '{}');
      return !!existingData[email]?.enabled;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Get 2FA details for the current user
  function getTwoFactorSetupDetails() {
    if (!currentUser?.email) return null;
    
    try {
      const existingData = JSON.parse(localStorage.getItem(TWO_FACTOR_SECRET_KEY) || '{}');
      return existingData[currentUser.email] || null;
    } catch (error) {
      console.error('Error getting 2FA details:', error);
      return null;
    }
  }

  // Verify 2FA code during login
  async function verifyTwoFactorAuth(email, token) {
    if (!email) {
      email = pendingLoginEmail || localStorage.getItem(PENDING_LOGIN_EMAIL_KEY);
    }
    
    if (!email) {
      throw new Error("No email provided for 2FA verification");
    }
    
    try {
      const existingData = JSON.parse(localStorage.getItem(TWO_FACTOR_SECRET_KEY) || '{}');
      const userData = existingData[email];
      
      if (!userData?.secret) {
        throw new Error("Two-factor authentication is not set up for this account");
      }
      
      // Verify the token
      const isValid = authenticator.verify({
        token: token,
        secret: userData.secret
      });
      
      if (isValid) {
        console.log('Verification code is valid');
        // Clear the pending login email since verification is complete
        setPendingLoginEmail(null);
        localStorage.removeItem(PENDING_LOGIN_EMAIL_KEY);
        
        // Store authentication status in localStorage regardless of user state
        localStorage.setItem('2fa_authenticated', 'true');
        localStorage.setItem('2fa_authenticated_email', email);
        
        // Always return success - we'll handle the current user check in the login component
        return {
          success: true,
          // If we have currentUser, use it, otherwise pass the email
          user: currentUser || { email }
        };
      } else {
        console.log('Invalid verification code');
        return {
          success: false,
          message: "Invalid verification code"
        };
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      throw error;
    }
  }

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      }, (error) => {
        console.error("Auth state change error:", error);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up auth state listener:", error);
      setLoading(false);
    }
  }, [auth]);

  const value = {
    currentUser,
    pendingLoginEmail,
    signup,
    login,
    logout,
    signInWithGoogle,
    signInWithGithub,
    updateUserProfile,
    refreshUserProfile,
    sendEmailVerification,
    isEmailVerified,
    sendEmailOTP,
    verifyEmailLink,
    resetPassword,
    checkEmailExists,
    deleteAccount,
    emailVerificationSent,
    // MFA related functions
    getEnrolledFactors,
    enrollPhoneMFA,
    verifyPhoneMFACode,
    verifyPhoneForMFA,
    completeMultiFactorSignIn,
    multiFactorError,
    clearMultiFactorError,
    resolver,
    // 2FA functions
    setupTwoFactorAuth,
    disableTwoFactorAuth,
    verifyTwoFactorAuth,
    isTwoFactorEnabled,
    getTwoFactorSetupDetails
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}