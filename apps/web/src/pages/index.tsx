import { NextPage } from "next";
import { useState } from "react";
import { useBroadcast, useEvent } from "../components";

export const Page: NextPage = () => {
    const [messages, setMessages] = useState<readonly string[]>([]);
    const [value, setValue] = useState<string>("");

    const broadcast = useBroadcast();

    useEvent("RECEIVE_MESSAGE", ({ message }) => {
        setMessages((oldMessages) => [...oldMessages, message]);
    });

    return (
        <div>
            <div>
                <input
                    onChange={(event) => {
                        setValue(event.target.value);
                    }}
                />
                <button
                    onClick={() => {
                        broadcast({
                            type: "SEND_MESSAGE",
                            data: {
                                message: value
                            }
                        })
                    }}
                    type="button"
                >
                    Send
                </button>
            </div>
            <ul>
                {messages.map((message, i) => (
                    <li key={i}>{message}</li>
                ))}
            </ul>
        </div>
    );
};
