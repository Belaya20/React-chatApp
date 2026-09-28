import { useState } from "react";
import { toast } from "react-toastify";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import upload from "../../../lib/upload";
import { useUserStore } from "../../../lib/userStore";

const EditProfile = ({ onClose }) => {
  const { currentUser, fetchUserInfo } = useUserStore();
  const [username, setUsername] = useState(currentUser?.username || "");
  const [avatar, setAvatar] = useState({ file: null, url: "" });
  const [saving, setSaving] = useState(false);

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar({ file, url: URL.createObjectURL(file) });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const name = username.trim();
    if (!name) {
      toast.warn("Username can't be empty");
      return;
    }

    setSaving(true);

    try {
      if (name !== currentUser.username) {
        const snap = await getDocs(
          query(collection(db, "users"), where("username", "==", name))
        );
        if (!snap.empty && snap.docs[0].id !== currentUser.id) {
          toast.error("That username is already taken");
          return;
        }
      }

      let avatarUrl = currentUser.avatar || "";
      if (avatar.file) {
        try {
          avatarUrl = await upload(avatar.file);
        } catch (uploadErr) {
          console.log(uploadErr);
          toast.warn("Picture could not be uploaded. Keeping the old one.");
        }
      }

      await updateDoc(doc(db, "users", currentUser.id), {
        username: name,
        avatar: avatarUrl,
      });
      await fetchUserInfo(currentUser.id);

      toast.success("Profile updated");
      onClose();
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editOverlay" onClick={onClose}>
      <form
        className="editProfile"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <h3>Edit profile</h3>

        <label htmlFor="editAvatar" className="editAvatar">
          <img src={avatar.url || currentUser?.avatar || "./avatar.png"} alt="" />
          Change picture
        </label>
        <input
          type="file"
          id="editAvatar"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatar}
        />

        <input
          type="text"
          placeholder="Username"
          maxLength={30}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="editActions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;