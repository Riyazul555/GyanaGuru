import React, { useState, useContext } from "react";
import { auth, db } from "../database/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { setCookie } from "cookies-next";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { showToast } from "@/Components/util/Toast";

export const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  function signup(email, password) {
    const result = createUserWithEmailAndPassword(auth, email, password);
    result.then((userCredential) => {
      const user = userCredential.user;
      sendEmailVerification(user);
    });
    return result;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  // new functions for google login and signup

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then((result) => {
      getDoc(doc(db, "users", result.user.uid)).then((docSnap) => {
        if (docSnap.exists()) {
          setCookie(null, "user", JSON.stringify(docSnap.data()), {
            path: "/",
          });
          router.push("/dashboard");
        } else {
          showToast("User not found, please Sign Up", "error");
          setCookie(null, "user", JSON.stringify(result.user), { path: "/" });
        }
      });
    });
  }

  function signUpWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then((result) => {
      getDoc(doc(db, "users", result.user.uid)).then((docSnap) => {
        if (docSnap.exists()) {
          showToast("User already exists, please Login", "error");
        } else {
          result.user && setCurrentUser(result.user);
          setCookie(null, "user", JSON.stringify(result.user), { path: "/" });
          // set login cookie
          setCookie("login", true);
          router.push("/profile");
        }
      });
    });
  }

  // database functions for user

  function addUserToDatabase(user) {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          showToast("User already exists, please Login", "error");
        } else {
          setDoc(userRef, user)
            .then(() => {
              showToast("User added successfully", "success");
              router.push("/dashboard");
            })
            .catch((error) => {
              showToast(error.message, "error");
            });

          setCookie(null, "user", JSON.stringify(user), { path: "/" });
        }
      });
    }
  }

  const value = {
    currentUser,
    signup,
    login,
    error,
    logout,
    loginWithGoogle,
    signUpWithGoogle,
    addUserToDatabase,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
