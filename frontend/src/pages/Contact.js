import React from "react";
import styles from "./Contact.module.css";


function Contact() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h2>Contact Us</h2>
      <p>📍 Royal Rasoi, Mysuru</p>
      <p>📞 Phone: +91 9876543210</p>
      <p>📧 Email: royalrasoi@gmail.com</p>

      <form style={{ marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Your Name"
          style={{ padding: "10px", margin: "10px", width: "250px" }}
        />
        <br />

        <input
          type="email"
          placeholder="Your Email"
          style={{ padding: "10px", margin: "10px", width: "250px" }}
        />
        <br />

        <textarea
          placeholder="Your Message"
          style={{ padding: "10px", margin: "10px", width: "250px" }}
        />
        <br />

        <button style={{ padding: "10px 20px" }}>
          Send Message
        </button>
      </form>
    </div>
  );
}

export default Contact;