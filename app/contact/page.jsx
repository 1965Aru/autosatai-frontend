// "use client";

// import React, { useState } from "react";
// import { useRouter } from "next/navigation";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faEnvelope, faPhone } from "@fortawesome/free-solid-svg-icons";
// import {
//   faFacebook,
//   faInstagram,
//   faLinkedin,
//   faTwitter,
// } from "@fortawesome/free-brands-svg-icons";
// import Navbar from "../../components/Navbar";

// export default function ContactPage() {
//   const [formData, setFormData] = useState({ name: "", email: "", message: "" });
//   const [submitted, setSubmitted] = useState(false);
//   const router = useRouter();

//   const handleChange = (e) => {
//     setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log(formData);
//     setSubmitted(true);
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white">
//       <Navbar />

//       <div className="pt-20 pb-20 max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12">
//         {/* Left: Info Section */}
//         <div className="space-y-6">
//           <h1 className="text-4xl font-bold">
//             Let's talk on something{" "}
//             <span className="text-pink-500">great</span> together
//           </h1>
//           <p className="text-gray-300 max-w-md">
//             Feel free to reach out! Whether it's about satellite data,
//             collaborations, or any inquiries, we're here to help.
//           </p>

//           <div className="space-y-4 text-gray-300">
//             <div className="flex items-center space-x-3">
//               <FontAwesomeIcon icon={faEnvelope} className="text-purple-500" />
//               <span>autosatAI@gmail.com</span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <FontAwesomeIcon icon={faPhone} className="text-purple-500" />
//               <span>+91 9834456789</span>
//             </div>
//           </div>

//           <div className="flex space-x-4 mt-4 text-gray-400">
//             {[faFacebook, faInstagram, faLinkedin, faTwitter].map((icon, i) => (
//               <a
//                 key={i}
//                 href="#"
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="hover:text-white transition"
//               >
//                 <FontAwesomeIcon icon={icon} size="lg" />
//               </a>
//             ))}
//           </div>
//         </div>

//         {/* Right: Form Section */}
//         <div className="bg-white rounded-lg p-8 shadow-lg text-gray-800">
//           <form onSubmit={handleSubmit} className="space-y-6">
//             <div>
//               <label htmlFor="name" className="block text-sm font-semibold mb-1">
//                 Your name
//               </label>
//               <input
//                 id="name"
//                 name="name"
//                 value={formData.name}
//                 onChange={handleChange}
//                 required
//                 className="w-full bg-gray-100 rounded-lg p-4 focus:outline-none"
//               />
//             </div>

//             <div>
//               <label htmlFor="email" className="block text-sm font-semibold mb-1">
//                 Email
//               </label>
//               <input
//                 id="email"
//                 name="email"
//                 type="email"
//                 placeholder="example@gmail.com"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//                 className="w-full bg-gray-100 rounded-lg p-4 focus:outline-none"
//               />
//             </div>

//             <div>
//               <label htmlFor="message" className="block text-sm font-semibold mb-1">
//                 Your message
//               </label>
//               <textarea
//                 id="message"
//                 name="message"
//                 value={formData.message}
//                 onChange={handleChange}
//                 required
//                 rows={6}
//                 className="w-full bg-gray-100 rounded-lg p-4 focus:outline-none"
//               />
//             </div>

//             <button
//               type="submit"
//               className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:opacity-90 transition"
//             >
//               Send message
//             </button>

//             {submitted && (
//               <p className="text-center text-green-500 font-medium">
//                 Message sent successfully!
//               </p>
//             )}
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }





"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faPhone } from "@fortawesome/free-solid-svg-icons";
import {
  faFacebook,
  faInstagram,
  faLinkedin,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";
import Navbar from "../../components/Navbar";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />

      <div className="pt-24 pb-20 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16">
        {/* Contact Info */}
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight">
            Let's talk on something <span className="text-pink-500">great</span> together
          </h1>
          <p className="text-gray-300 text-lg">
            "Feel free to reach out! Whether it's about satellite data, collaborations, or any inquiries, we're here to help."
          </p>

          <div className="space-y-4 text-gray-300">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faEnvelope} className="text-purple-500" />
              <span>autosatAI@gmail.com</span>
            </div>
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faPhone} className="text-purple-500" />
              <span>+91 9834456789</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4 text-gray-400">
            {[faFacebook, faInstagram, faLinkedin, faTwitter].map((icon, i) => (
              <a
                key={i}
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                <FontAwesomeIcon icon={icon} size="lg" />
              </a>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-gray-800 transition duration-300 hover:shadow-purple-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {["name", "email"].map((field) => (
              <div key={field} className="relative">
                <input
                  id={field}
                  name={field}
                  type={field === "email" ? "email" : "text"}
                  placeholder=" "
                  value={formData[field]}
                  onChange={handleChange}
                  required
                  className="peer w-full bg-gray-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <label
                  htmlFor={field}
                  className="absolute left-4 top-3 text-sm text-gray-600 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all"
                >
                  {field === "name" ? "Your Name" : "Email"}
                </label>
              </div>
            ))}

            <div className="relative">
              <textarea
                id="message"
                name="message"
                placeholder=" "
                value={formData.message}
                onChange={handleChange}
                rows={5}
                required
                className="peer w-full bg-gray-100 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <label
                htmlFor="message"
                className="absolute left-4 top-3 text-sm text-gray-600 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all"
              >
                Your Message
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:opacity-90 transition"
            >
              Send Message
            </button>

            {submitted && (
              <p className="text-center text-green-600 font-medium">
                ✅ Message sent successfully!
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
