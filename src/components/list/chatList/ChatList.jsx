import { useEffect, useState } from "react";
import "./chatList.css";
import AddUser from "./addUser/AddUser";
import { useUserStore } from "../../../lib/userStore";
import { onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useChatStore } from "../../../lib/chatStore";

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");
  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();
  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;

    const unSub = onSnapshot(
      doc(db, "userchats", userId),
      async (res) => {
        const items = res.data()?.chats || [];

        const chatData = await Promise.all(
          items.map(async (item) => {
            const userSnap = await getDoc(doc(db, "users", item.receiverId));
            return { ...item, user: userSnap.data() };
          })
        );

        setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
      },
      (err) => console.log(err)
    );

    return () => {
      unSub();
    };
  }, [userId]);

  const handleSelect = async (chat) => {
    changeChat(chat.chatId, chat.user);
    setAddMode(false);

    if (chat.isSeen) return;

    const userChats = chats.map((item) => {
      const { user, ...rest } = item;
      return rest;
    });

    const index = userChats.findIndex((item) => item.chatId === chat.chatId);
    if (index === -1) return;
    userChats[index].isSeen = true;

    try {
      await updateDoc(doc(db, "userchats", userId), { chats: userChats });
    } catch (err) {
      console.log("Error updating user chats: ", err);
    }
  };

  const filteredChats = chats.filter((c) =>
    (c.user?.username || "").toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="chatList">
      <div className="search">
        <div className="searchBar">
          <img src="./search.png" alt="" />
          <input
            type="text"
            placeholder="Search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <img
          src={addMode ? "./minus.png" : "./plus.png"}
          alt=""
          className="add"
          onClick={() => setAddMode((prev) => !prev)}
        />
      </div>

      {filteredChats.map((chat) => (
        <div
          className="item"
          key={chat.chatId}
          onClick={() => handleSelect(chat)}
          style={{
            backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
          }}
        >
          <img src={chat.user?.avatar || "./avatar.png"} alt="" />
          <div className="texts">
            <span>{chat.user?.username || "Unknown User"}</span>
            <p>{chat.lastMessage || "No messages"}</p>
          </div>
        </div>
      ))}

      {addMode && <AddUser onClose={() => setAddMode(false)} />}
    </div>
  );
};

export default ChatList;