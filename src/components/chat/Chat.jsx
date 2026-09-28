import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import upload from "../../lib/upload";
import { meetingLink } from "../../lib/meet";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";

// Dictation language. Change to another code (for example "am-ET") if your browser supports it.
const DICTATION_LANG = "en-US";

const renderText = (value) =>
  value.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      part
    )
  );

const Chat = () => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [img, setImg] = useState({ file: null, url: "" });

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked, resetChat, toggleDetail } =
    useChatStore();

  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const blocked = isCurrentUserBlocked || isReceiverBlocked;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, img.url]);

  useEffect(() => {
    if (!chatId) return;

    setChat(undefined);
    const unSub = onSnapshot(
      doc(db, "chats", chatId),
      (res) => setChat(res.data()),
      (err) => console.log(err)
    );

    return () => {
      unSub();
    };
  }, [chatId]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImg({ file, url: URL.createObjectURL(file) });
    }
    e.target.value = "";
  };

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info("Dictation isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = DICTATION_LANG;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setText((prev) => (prev ? prev + " " : "") + transcript);
    };
    recognition.onerror = (e) => toast.error(`Dictation error: ${e.error}`);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const sendMessage = async (message, imgUrl = null) => {
    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion({
        senderId: currentUser.id,
        text: message,
        createdAt: new Date(),
        ...(imgUrl && { img: imgUrl }),
      }),
    });

    await Promise.all(
      [currentUser.id, user.id].map(async (id) => {
        const userChatsRef = doc(db, "userchats", id);
        const snap = await getDoc(userChatsRef);
        if (!snap.exists()) return;

        const chats = snap.data().chats;
        const index = chats.findIndex((c) => c.chatId === chatId);
        if (index === -1) return;

        chats[index].lastMessage = message || "Photo";
        chats[index].isSeen = id === currentUser.id;
        chats[index].updatedAt = Date.now();

        await updateDoc(userChatsRef, { chats });
      })
    );
  };

  const handleSend = async () => {
    const message = text.trim();
    if ((message === "" && !img.file) || !user || sending) return;

    setSending(true);

    try {
      const imgUrl = img.file ? await upload(img.file) : null;
      await sendMessage(message, imgUrl);
      setImg({ file: null, url: "" });
      setText("");
    } catch (err) {
      console.log(err);
      toast.error(typeof err === "string" ? err : err.message);
    } finally {
      setSending(false);
    }
  };

  const startCall = async (audioOnly) => {
    if (blocked || !user) return;

    const link = meetingLink(chatId, audioOnly);
    window.open(link, "_blank", "noopener,noreferrer");

    try {
      await sendMessage(`${audioOnly ? "📞 Voice call" : "📹 Video call"}: ${link}`);
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <button className="backBtn" onClick={resetChat}>←</button>
          <img src={user?.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>{user?.username || "User"}</span>
            <p>{blocked ? "You can't send a message" : "Hey, how are you?"}</p>
          </div>
        </div>
        <div className="icons">
          <img src="./phone.png" alt="" title="Voice call" onClick={() => startCall(true)} />
          <img src="./video.png" alt="" title="Video call" onClick={() => startCall(false)} />
          <img src="./info.png" alt="" title="Chat details" className="infoBtn" onClick={toggleDetail} />
        </div>
      </div>

      <div className="center">
        {chat?.messages?.map((message, i) => {
          const time = message.createdAt?.toDate
            ? format(message.createdAt.toDate(), "HH:mm")
            : "";

          return (
            <div
              className={`message ${message.senderId === currentUser.id ? "own" : ""}`}
              key={i}
            >
              <div className="texts">
                {message.img && <img src={message.img} alt="" />}
                {message.text && <p>{renderText(message.text)}</p>}
                {time && <span className="time">{time}</span>}
              </div>
            </div>
          );
        })}
        {img.url && (
          <div className="message own">
            <div className="texts">
              <img
                src={img.url}
                alt=""
                title="Click to remove"
                style={{ cursor: "pointer" }}
                onClick={() => setImg({ file: null, url: "" })}
              />
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      <div className="bottom">
        <div className="icons">
          <label htmlFor="file">
            <img src="./img.png" alt="" title="Send a photo" />
          </label>
          <input
            type="file"
            id="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <label htmlFor="camera">
            <img src="./camera.png" alt="" title="Take a photo" />
          </label>
          <input
            type="file"
            id="camera"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img
            src="./mic.png"
            alt=""
            title={listening ? "Stop dictation" : "Dictate a message"}
            className={listening ? "micActive" : ""}
            onClick={toggleMic}
          />
        </div>
        <input
          type="text"
          placeholder={blocked ? "You cannot send a message" : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={blocked}
        />
        <div className="emoji">
          <img src="./emoji.png" alt="" onClick={() => setOpen((prev) => !prev)} />
          <div className="picker">
            <EmojiPicker open={open} onEmojiClick={handleEmoji} />
          </div>
        </div>
        <button className="sendButton" onClick={handleSend} disabled={blocked || sending}>
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;