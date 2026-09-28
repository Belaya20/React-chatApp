import "./addUser.css";
import { db } from "../../../../lib/firebase";
import {
  collection,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { useState } from "react";
import { toast } from "react-toastify";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username")?.trim();
    if (!username) return;

    try {
      const q = query(collection(db, "users"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setUser(querySnapshot.docs[0].data());
      } else {
        setUser(null);
        toast.info("No user found with that username");
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  const handleAdd = async () => {
    if (!user) return;

    if (user.id === currentUser.id) {
      toast.warn("You can't add yourself");
      return;
    }

    try {
      const myChatsSnap = await getDoc(doc(db, "userchats", currentUser.id));
      const myChats = myChatsSnap.data()?.chats || [];
      if (myChats.some((c) => c.receiverId === user.id)) {
        toast.info("This user is already in your chat list");
        return;
      }

      const newChatRef = doc(collection(db, "chats"));
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
      });

      await setDoc(
        doc(db, "userchats", user.id),
        {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: currentUser.id,
            updatedAt: Date.now(),
            isSeen: false,
          }),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "userchats", currentUser.id),
        {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            receiverId: user.id,
            updatedAt: Date.now(),
            isSeen: true,
          }),
        },
        { merge: true }
      );

      toast.success("User added");
      setUser(null);
      onClose?.();
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  return (
    <div className="addUser">
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Username" name="username" />
        <button>Search</button>
      </form>
      {user && (
        <div className="user">
          <div className="detail">
            <img src={user.avatar || "./avatar.png"} alt="" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleAdd}>Add User</button>
        </div>
      )}
    </div>
  );
};

export default AddUser;