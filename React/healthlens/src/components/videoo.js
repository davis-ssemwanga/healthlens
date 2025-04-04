import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import Peer from "simple-peer";
import {
  getAvailableUsers,
  verifyAuth,
  startCallSession,
  endCallSession,
  checkCallStatus,
} from "../api";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
} from "react-icons/fa";
import "./Video.css";

const Video = forwardRef(
  ({ socketRef, acceptCall, rejectCall, onReady }, ref) => {
    const [authUser, setAuthUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [callSession, setCallSession] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerRef = useRef(null);

    const checkActiveCallStatus = useCallback(async () => {
      if (callSession) {
        try {
          const status = await checkCallStatus(callSession.id);
          console.log(`Call status for session ${callSession.id}:`, status);
          if (status.isConnected && !isCallActive) {
            setIsCallActive(true);
            setIsBuffering(false);
          }
        } catch (error) {
          console.error("Failed to check call status:", error);
        }
      }
    }, [callSession, isCallActive]);

    useEffect(() => {
      const fetchAuthData = async () => {
        const authData = await verifyAuth();
        if (authData.isAuthenticated) {
          setAuthUser(authData);
          setUserRole(authData.role);
          fetchUsers();
        }
      };
      fetchAuthData();

      const interval = setInterval(checkActiveCallStatus, 2000);
      if (onReady) onReady();
      return () => clearInterval(interval);
    }, [onReady, checkActiveCallStatus]);

    useEffect(() => {
      if (localStream && localVideoRef.current) {
        console.log("Assigning local stream:", localStream.getTracks());
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current
          .play()
          .catch((err) => console.error("Local video play error:", err));
      }
    }, [localStream]);

    useEffect(() => {
      if (remoteStream && remoteVideoRef.current) {
        console.log("Assigning remote stream:", remoteStream.getTracks());
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play()
          .catch((err) => console.error("Remote video play error:", err));
        remoteVideoRef.current.load();
      }
    }, [remoteStream]);

    useEffect(() => {
      if (socketRef.current) {
        const handleMessage = (event) => {
          console.log("WebSocket message received on sender:", event.data);
          const message = JSON.parse(event.data);

          if (message.type === "answer" && peerRef.current) {
            console.log("Caller processing answer signal:", message.signalData);
            peerRef.current.signal(message.signalData);
          } else {
            console.log("Unhandled message type on sender:", message.type);
          }
        };

        socketRef.current.onmessage = handleMessage;
      }
    }, [socketRef]);

    const fetchUsers = async () => {
      const users = await getAvailableUsers();
      setAvailableUsers(users);
    };

    const initiateCall = useCallback(
      async (user) => {
        setSelectedUser(user);
        setIsBuffering(true);

        try {
          let stream = localStream;
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            setLocalStream(stream);
          }
          console.log("Local stream tracks:", stream.getTracks());

          const payload = {
            doctor_id:
              userRole === "doctor" ? parseInt(authUser.id) : parseInt(user.id),
            patient_id:
              userRole === "patient"
                ? parseInt(authUser.id)
                : parseInt(user.id),
          };
          const session = await startCallSession(payload);
          setCallSession(session);

          peerRef.current = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
          });

          peerRef.current.on("signal", (data) => {
            console.log("Caller sending offer signal:", data);
            if (socketRef.current.readyState === WebSocket.OPEN) {
              socketRef.current.send(
                JSON.stringify({
                  type: "call-user",
                  userId: user.id,
                  signalData: data,
                  callSessionId: session.id,
                })
              );
              console.log("Offer signal sent to WebSocket");
            } else {
              console.error("WebSocket not open, cannot send offer");
            }
          });

          peerRef.current.on("stream", (stream) => {
            console.log("Caller received remote stream:", stream.getTracks());
            setRemoteStream(stream);
            setIsCallActive(true);
            setIsBuffering(false);
          });

          peerRef.current.on("connect", () => {
            console.log("Peer connection established for caller");
          });

          peerRef.current.on("error", (err) => {
            console.error("Peer error in initiateCall:", err);
          });
        } catch (error) {
          console.error("Failed to initiate call:", error);
          setIsBuffering(false);
          alert("Failed to initiate call. Check camera/mic permissions.");
        }
      },
      [authUser, userRole, localStream, socketRef]
    );

    const handleAcceptCall = useCallback(
      async (signalData, fromUserId, callSessionId) => {
        setIsBuffering(true);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setLocalStream(stream);
          console.log("Receiver local stream tracks:", stream.getTracks());

          peerRef.current = new Peer({
            initiator: false,
            trickle: false,
            stream,
          });

          peerRef.current.on("signal", (data) => {
            console.log("Receiver generating answer signal:", data);
            if (
              socketRef.current &&
              socketRef.current.readyState === WebSocket.OPEN
            ) {
              const message = {
                type: "call-accepted",
                userId: fromUserId,
                signalData: data,
                callSessionId,
              };
              const messageString = JSON.stringify(message);
              socketRef.current.send(messageString);
              console.log(
                "Receiver sent call-accepted message:",
                messageString
              );
            } else {
              console.error(
                "WebSocket not open or not initialized, cannot send answer"
              );
            }
          });

          peerRef.current.on("stream", (stream) => {
            console.log("Receiver received remote stream:", stream.getTracks());
            setRemoteStream(stream);
            setIsCallActive(true);
            setIsBuffering(false);
          });

          peerRef.current.on("connect", () => {
            console.log("Peer connection established for receiver");
          });

          peerRef.current.on("error", (err) =>
            console.error("Peer error on accept:", err)
          );

          peerRef.current.signal(signalData);
          setCallSession({ id: callSessionId });
          acceptCall(signalData, fromUserId, callSessionId);
        } catch (error) {
          console.error("Error accepting call:", error);
          setIsBuffering(false);
          alert("Failed to accept call. Check camera/mic permissions.");
        }
      },
      [socketRef, acceptCall]
    );

    useImperativeHandle(ref, () => ({
      handleAcceptCall,
    }));

    const toggleMedia = (type) => {
      if (localStream) {
        const track =
          type === "video"
            ? localStream.getVideoTracks()[0]
            : localStream.getAudioTracks()[0];
        if (track) {
          track.enabled = !track.enabled;
          type === "video"
            ? setIsVideoOn(track.enabled)
            : setIsAudioOn(track.enabled);
        }
      }
    };

    const endCall = () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (callSession) endCallSession(callSession.id);
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      setIsCallActive(false);
      setRemoteStream(null);
      setLocalStream(null);
      setCallSession(null);
      setSelectedUser(null);
      setIsBuffering(false);
    };

    if (!authUser) return <div>Loading video chat...</div>;

    return (
      <div className="video-container">
        <div className="users-list">
          <h3>Users</h3>
          <ul>
            {availableUsers.map((user) => (
              <li key={user.id} onClick={() => initiateCall(user)}>
                {user.first_name} {user.last_name}
              </li>
            ))}
          </ul>
        </div>

        <div className="video-area">
          {isBuffering && <div className="buffering-circle">Buffering...</div>}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className={`local-video ${
                isCallActive ? "local-video-small" : ""
              }`}
            />
          )}
          {isCallActive && remoteStream && (
            <video ref={remoteVideoRef} autoPlay className="remote-video" />
          )}

          {isCallActive && (
            <div className="controls">
              <button
                onClick={() => toggleMedia("video")}
                className={isVideoOn ? "active" : "inactive"}
              >
                {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button
                onClick={() => toggleMedia("audio")}
                className={isAudioOn ? "active" : "inactive"}
              >
                {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button onClick={endCall} className="end-call-btn">
                <FaPhoneSlash />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Video;
