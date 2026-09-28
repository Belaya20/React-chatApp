import { useState } from "react";
import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import "./login.css";
import { auth, db } from "../../lib/firebase";
import upload from "../../lib/upload";
import { useUserStore } from "../../lib/userStore";

const Login = () => {
  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [loading, setLoading] = useState(false);
  const { fetchUserInfo } = useUserStore();

  const handleAvatar = (e) => {
    if (e.target.files[0]) {
      setAvatar({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);

    if (!username.trim() || !email.trim() || !password) {
      toast.warn("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);

      let imgUrl = "";
      if (avatar.file) {
        try {
          imgUrl = await upload(avatar.file);
        } catch (uploadErr) {
          console.log(uploadErr);
          toast.warn("Profile picture could not be uploaded. Continuing without it.");
        }
      }

      await setDoc(doc(db, "users", res.user.uid), {
        username: username.trim(),
        avatar: imgUrl,
        email: email.trim(),
        id: res.user.uid,
        blocked: [],
      });
      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: [],
      });

      await fetchUserInfo(res.user.uid);
      toast.success("Account created!");
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    if (!email.trim() || !password) {
      toast.warn("Enter your email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      await fetchUserInfo(res.user.uid);

      if (!useUserStore.getState().currentUser) {
        toast.error("No profile found for this account. Please create a new account.");
        await signOut(auth);
      }
    } catch (err) {
      console.log(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="item">
        <h2>Welcome Back</h2>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "loading" : "Sign In"}</button>
        </form>
      </div>
      <div className="separator"></div>
      <div className="item">
        <h2>Create an Account</h2>
        <form onSubmit={handleRegister}>
          <label htmlFor="file">
            <img src={avatar.url || "./avatar.png"} alt="" />
            Upload Image
          </label>
          <input type="file" id="file" style={{ display: "none" }} onChange={handleAvatar} />
          <input type="text" placeholder="Username" name="username" />
          <input type="email" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "loading" : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
};

export default Login;