import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const NotificationDropdown = ({
  isOpen,
  notifications,
  unreadCount,
  onClose,
  bellRef,
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        bellRef?.current &&
        !bellRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, bellRef]);

  if (!isOpen) return null;

  // Calcular posición del dropdown relativa al bell
  let dropdownStyle = {};
  if (bellRef?.current) {
    const bellRect = bellRef.current.getBoundingClientRect();
    dropdownStyle = {
      position: "fixed",
      top: `${bellRect.bottom + 12}px`,
      right: `${window.innerWidth - bellRect.right}px`,
    };
  }

  return createPortal(
    <div
      ref={dropdownRef}
      className="notification-dropdown"
      style={dropdownStyle}
    >
      <div className="notification-header">
        <h4>Notificaciones</h4>
        {unreadCount > 0 ? (
          <span className="notification-status unread">
            {unreadCount} sin leer
          </span>
        ) : (
          <span className="notification-status">Todo al día</span>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">No tienes notificaciones</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item${
                notification.leido ? "" : " unread"
              }`}
            >
              <div className="notification-title">{notification.titulo}</div>
              <div className="notification-message">{notification.mensaje}</div>
              <div className="notification-meta">
                {notification.ciudadanoNombre && (
                  <span className="notification-author">
                    {notification.ciudadanoNombre}
                  </span>
                )}
                <span>
                  {notification.createdAt
                    ? new Date(notification.createdAt).toLocaleString("es-EC")
                    : ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );
};

export default NotificationDropdown;
