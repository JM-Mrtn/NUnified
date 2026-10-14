import { useEffect, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

function MaterialIcon({ name }) {
  return <span className="material-symbols-rounded">{name}</span>;
}

const emptyForm = {
  type: "",
  title: "",
  content: "",
  date: "",
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp"];

export default function CreatePost() {
  const [formData, setFormData] = useState(emptyForm);

  const [imageFile, setImageFile] = useState(null);

  const [imagePreview, setImagePreview] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     PREVIEW CLEANUP
  =================================================== */

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  /* ===================================================
     FORM
  =================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /* ===================================================
     IMAGE
  =================================================== */

  const handleImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (!ALLOWED_IMAGES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");

      event.target.value = "";

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image must be 5 MB or smaller.");

      event.target.value = "";

      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);

    const preview = URL.createObjectURL(file);

    setImagePreview(preview);
  };

  /* ===================================================
     REMOVE IMAGE
  =================================================== */

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);

    setImagePreview("");
  };

  /* ===================================================
     SUBMIT
  =================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.type) {
      setError("Please select a Post Type.");

      return;
    }

    if (!formData.title.trim()) {
      setError("Please enter a Title.");

      return;
    }

    if (!formData.content.trim()) {
      setError("Please enter Post Content.");

      return;
    }

    setSubmitting(true);

    try {
      /*
          FormData is REQUIRED because
          we're uploading an image.
        */

      const payload = new FormData();

      payload.append("type", formData.type);

      payload.append("title", formData.title.trim());

      payload.append("content", formData.content.trim());

      payload.append("eventDate", formData.date || "");

      if (imageFile) {
        /*
            IMPORTANT:
            "image" MUST match:

            upload.single("image")

            in announcements.js
          */

        payload.append("image", imageFile, imageFile.name);
      }

      /*
          IMPORTANT:

          DO NOT put:

          headers: {
            "Content-Type":
              "multipart/form-data"
          }

          Axios/browser creates the
          multipart boundary for us.
        */

      const response = await api.post("/announcements", payload);

      setSuccess(
        response.data?.message ||
          "Post submitted successfully for Administrator review.",
      );

      setFormData(emptyForm);

      removeImage();
    } catch (err) {
      console.error("CREATE POST ERROR:", err);

      console.error("SERVER RESPONSE:", err.response?.data);

      setError(err.response?.data?.message || "Unable to create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="
          rounded-3xl
          bg-gradient-to-r
          from-[#020617]
          via-[#001F3F]
          to-[#003B7A]
          p-8
          text-white
        "
      >
        <p
          className="
            text-sm
            font-bold
            uppercase
            tracking-widest
            text-yellow-400
          "
        >
          Organization Content
        </p>

        <h1
          className="
            mt-3
            text-4xl
            font-black
          "
        >
          Create Announcement / News
        </h1>

        <p
          className="
            mt-3
            text-gray-200
          "
        >
          Share updates, announcements, and event information with students.
        </p>
      </motion.div>

      {/* ERROR */}

      {error && (
        <div
          className="
            flex
            items-start
            gap-3
            rounded-2xl
            border
            border-red-200
            bg-red-50
            p-4
            text-red-700
          "
        >
          <MaterialIcon name="error" />

          <div>
            <p className="font-black">Unable to Submit</p>

            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          className="
            flex
            items-start
            gap-3
            rounded-2xl
            border
            border-green-200
            bg-green-50
            p-4
            text-green-700
          "
        >
          <MaterialIcon name="check_circle" />

          <div>
            <p className="font-black">Submitted for Review</p>

            <p className="mt-1 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* FORM */}

      <motion.form
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        onSubmit={handleSubmit}
        className="
          rounded-3xl
          bg-white
          p-7
          shadow-lg
        "
      >
        <h2
          className="
            text-2xl
            font-black
            text-blue-950
          "
        >
          Post Information
        </h2>

        {/* POST TYPE */}

        <div className="mt-6">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Post Type <span className="text-red-500">*</span>
          </label>

          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-gray-200
              bg-white
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-yellow-400
            "
          >
            <option value="">Select Type</option>

            <option value="Announcement">Announcement</option>

            <option value="News">News</option>
          </select>
        </div>

        {/* TITLE */}

        <div className="mt-5">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Title <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter post title"
            required
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-gray-200
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-yellow-400
            "
          />
        </div>

        {/* CONTENT */}

        <div className="mt-5">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Content <span className="text-red-500">*</span>
          </label>

          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows="7"
            placeholder="Write your announcement or news..."
            required
            className="
              mt-2
              w-full
              resize-none
              rounded-xl
              border
              border-gray-200
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-yellow-400
            "
          />
        </div>

        {/* EVENT DATE */}

        <div className="mt-5">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Event Date{" "}
            <span
              className="
                font-normal
                text-gray-400
              "
            >
              (Optional)
            </span>
          </label>

          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="
              mt-2
              w-full
              rounded-xl
              border
              border-gray-200
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-yellow-400
            "
          />
        </div>

        {/* IMAGE */}

        <div className="mt-6">
          <label
            className="
              text-sm
              font-black
              text-blue-950
            "
          >
            Upload Image{" "}
            <span
              className="
                font-normal
                text-gray-400
              "
            >
              (Optional)
            </span>
          </label>

          {!imagePreview ? (
            <label
              className="
                mt-2
                block
                cursor-pointer
                rounded-2xl
                border-2
                border-dashed
                border-gray-300
                bg-gray-50
                p-7
                text-center
                transition
                hover:border-yellow-400
                hover:bg-yellow-50
              "
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                className="hidden"
              />

              <div
                className="
                  mx-auto
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-950
                  text-yellow-400
                "
              >
                <MaterialIcon name="add_photo_alternate" />
              </div>

              <p
                className="
                  mt-3
                  font-black
                  text-blue-950
                "
              >
                Choose Image
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                "
              >
                JPG, PNG, or WEBP • Maximum 5 MB
              </p>
            </label>
          ) : (
            <div
              className="
                mt-2
                overflow-hidden
                rounded-2xl
                border
                border-gray-200
                bg-gray-50
              "
            >
              <img
                src={imagePreview}
                alt="Post preview"
                className="
                  max-h-[450px]
                  w-full
                  bg-gray-100
                  object-contain
                "
              />

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  p-4
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      truncate
                      font-black
                      text-blue-950
                    "
                  >
                    {imageFile?.name}
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-gray-500
                    "
                  >
                    This image will also be visible to the Administrator during
                    review.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={removeImage}
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-2
                    rounded-xl
                    bg-red-50
                    px-4
                    py-2
                    font-bold
                    text-red-600
                  "
                >
                  <MaterialIcon name="delete" />
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* REVIEW INFORMATION */}

        <div
          className="
            mt-6
            flex
            items-start
            gap-3
            rounded-2xl
            border
            border-blue-100
            bg-blue-50
            p-4
            text-blue-800
          "
        >
          <MaterialIcon name="admin_panel_settings" />

          <div>
            <p className="font-black">Administrator Review</p>

            <p
              className="
                mt-1
                text-sm
                leading-6
              "
            >
              After submission, this post will be sent to the Administrator. It
              will only appear on the Student Homepage after approval.
            </p>
          </div>
        </div>

        {/* SUBMIT */}

        <button
          type="submit"
          disabled={submitting}
          className="
            mt-7
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-gradient-to-r
            from-yellow-300
            to-yellow-500
            py-4
            font-black
            text-blue-950
            shadow
            transition
            hover:scale-[1.01]
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          <MaterialIcon name={submitting ? "hourglass_top" : "send"} />

          {submitting ? "Submitting..." : "Submit for Admin Review"}
        </button>
      </motion.form>
    </div>
  );
}
