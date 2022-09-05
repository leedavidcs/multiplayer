import { NextPage } from "next";
import { useState } from "react";
import { useBroadcast, useEvent } from "../components";

export const Page: NextPage = () => {
    const broadcast = useBroadcast();

    const [messages, setMessages] = useState<readonly string[]>([]);

    useEvent("RECEIVE_MESSAGE", ({ message }) => {
        setMessages((oldMessages) => [...oldMessages, message]);
    });

    return (
        <div>
            <ul>
                {messages.map((message, i) => (
                    <li key={i}>{message}</li>
                ))}
            </ul>
        </div>
    );
};
