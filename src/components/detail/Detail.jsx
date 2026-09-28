import "./detail.css";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { auth, db } from "../../lib/firebase";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";

const Detail = () => {
  const { currentUser, fetchUserInfo } = useUserStore();
  const {
    chatId,
    user,
    isCurrentUserBlocked,
    isReceiverBlocked,
    changeBlock,
    toggleDetail,
  } = useChatStore();

  const [openSection, setOpenSection] = useState("photos");
  const [photos, setPhotos] = useState([]);
  const [info, setInfo] = useState({ count: 0, started: "" });

  useEffect(() => {
    if (!chatId) return;

    const unSub = onSnapshot(
      doc(db, "chats", chatId),
      (res) => {
        const data = res.data();
        const messages = data?.messages || [];

        setPhotos(messages.filter((m) => m.img).map((m) => m.img).reverse());
        setInfo({
          count: messages.length,
          started: data?.createdAt?.toDate ? format(data.createdAt.toDate(), "PP") : "",
        });
      },
      (err) => console.log(err)
    );

    return () => {
      unSub();
    };
  }, [chatId]);

  const toggle = (key) => setOpenSection((prev) => (prev === key ? null : key));

  const handleBlock = async () => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
      });
      changeBlock();
      await fetchUserInfo(currentUser.id);
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  return (
    <div className="detail">
      <button className="backBtn" onClick={toggleDetail}>← Back to chat</button>

      <div className="user">
        <img src={user?.avatar || "./avatar.png"} alt="" />
        <h2>{user?.username}</h2>
        <p>We are university students.</p>
      </div>

      <div className="info">
        <div className="option">
          <div className="title" onClick={() => toggle("settings")}>
            <span>Chat Settings</span>
            <img src={openSection === "settings" ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
          </div>
          {openSection === "settings" && (
            <div className="content">
              <p>Messages in this chat: {info.count}</p>
              {info.started && <p>Started: {info.started}</p>}
            </div>
          )}
        </div>

        <div className="option">
          <div className="title" onClick={() => toggle("privacy")}>
            <span>Privacy & Help</span>
            <img src={openSection === "privacy" ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
          </div>
          {openSection === "privacy" && (
            <div className="content">
              <p>Use Block User below to stop a contact from messaging you.</p>
              <p>Tap the phone or video icon in the chat header to start a call.</p>
            </div>
          )}
        </div>

        <div className="option">
          <div className="title" onClick={() => toggle("photos")}>
            <span>Shared photos</span>
            <img src={openSection === "photos" ? "./arrowDown.png" : "./arrowUp.png"} alt="" className="icon" />
          </div>

          {openSection === "photos" && (
            <div className="photos">
              {photos.length === 0 && <p className="content">No photos shared yet.</p>}
              {photos.map((url, i) => (
                <div className="photoItem" key={url}>
                  <div className="photoDetail">
                    <img src={url} alt="" />
                    <span>Photo {photos.length - i}</span>
                  </div>
                  <a href={url} target="_blank" rel="noreferrer" title="Open / download">
                    <img src="./download.png" alt="" className="icon" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="option">
          <div className="title" onClick={() => toggle("files")}>
            <span>Shared files</span>
            <img src={openSection === "files" ? "./arrowDown.png" : "./arrowUp.png"} alt="" />
          </div>
          {openSection === "files" && (
            <div className="content">
              <p>File sharing isn't available yet.</p>
            </div>
          )}
        </div>

        <button onClick={handleBlock}>
          {isCurrentUserBlocked
            ? "you are Blocked!"
            : isReceiverBlocked
            ? "User Blocked"
            : "Block User"}
        </button>
        <button className="logout" onClick={() => signOut(auth)}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Detail;