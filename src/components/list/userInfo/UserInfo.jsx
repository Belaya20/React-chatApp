import "./userInfo.css";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "../../../lib/firebase";
import { meetingLink } from "../../../lib/meet";
import { useUserStore } from "../../../lib/userStore";
import EditProfile from "./EditProfile";

const UserInfo = () => {
  const { currentUser } = useUserStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const iconsRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const close = (e) => {
      if (!iconsRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const handleQuickMeeting = async () => {
    const link = meetingLink(crypto.randomUUID().slice(0, 12));
    window.open(link, "_blank", "noopener,noreferrer");

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Meeting link copied. Share it with anyone.");
    } catch {
      toast.info(link);
    }
  };

  return (
    <>
      <div className="userInfo">
        <div className="user">
          <img src={currentUser?.avatar || "./avatar.png"} alt="" />
          <h2>{currentUser?.username}</h2>
        </div>

        <div className="icons" ref={iconsRef}>
          <img
            src="./more.png"
            alt=""
            title="Menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          />
          <img
            src="./video.png"
            alt=""
            title="Start a meeting"
            onClick={handleQuickMeeting}
          />
          <img
            src="./edit.png"
            alt=""
            title="Edit profile"
            onClick={() => setEditOpen(true)}
          />

          {menuOpen && (
            <div className="menu">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
              >
                Edit profile
              </button>
              <button onClick={() => signOut(auth)}>Logout</button>
            </div>
          )}
        </div>
      </div>

      {editOpen && <EditProfile onClose={() => setEditOpen(false)} />}
    </>
  );
};

export default UserInfo;