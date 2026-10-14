import { useEffect, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   CONSTANTS
===================================================== */

const CROP_SIZE = 280;
const OUTPUT_SIZE = 500;

/* =====================================================
   MATERIAL ICON
===================================================== */

function MaterialIcon({ name, className = "" }) {
  return (
    <span
      className={`
        material-symbols-rounded
        leading-none
        ${className}
      `}
    >
      {name}
    </span>
  );
}

/* =====================================================
   EMPTY ORGANIZATION
===================================================== */

const EMPTY_ORGANIZATION = {
  organizationName: "",
  acronym: "",
  email: "",
  contactNumber: "",
  adviser: "",
  description: "",
  color: "#FACC15",
};

/* =====================================================
   ORGANIZATION PROFILE
===================================================== */

export default function OrganizationProfile() {
  const navigate = useNavigate();

  /* ===================================================
     ORGANIZATION
  =================================================== */

  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);

  /* ===================================================
     SAVED PROFILE IMAGE
  =================================================== */

  const [profileImage, setProfileImage] = useState("");

  /* ===================================================
     PAGE STATES
  =================================================== */

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     EDIT PROFILE
  =================================================== */

  const [showEdit, setShowEdit] = useState(false);

  const [editForm, setEditForm] = useState({
    adviser: "",
    contactNumber: "",
    description: "",
  });

  /* ===================================================
     CROP / REVIEW
  =================================================== */

  const [showCrop, setShowCrop] = useState(false);

  const [cropSource, setCropSource] = useState("");

  const [zoom, setZoom] = useState(1);

  const [cropX, setCropX] = useState(0);

  const [cropY, setCropY] = useState(0);

  const [naturalSize, setNaturalSize] = useState({
    width: 0,
    height: 0,
  });

  const cropImageRef = useRef(null);

  const dragRef = useRef({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startCropX: 0,
    startCropY: 0,
  });

  /* ===================================================
     INITIALS
  =================================================== */

  const initials =
    organization.acronym?.trim().slice(0, 4).toUpperCase() ||
    organization.organizationName
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 3)
      .toUpperCase() ||
    "NU";

  /* ===================================================
     LOAD ORGANIZATION
  =================================================== */

  const loadOrganization = async () => {
    const response = await api.get("/organizations/me");

    const org = response.data?.organization || response.data || {};

    setOrganization({
      ...EMPTY_ORGANIZATION,
      ...org,
    });

    return org;
  };

  /* ===================================================
     LOAD PROFILE PICTURE
  =================================================== */

  const loadProfilePicture = async () => {
    const response = await api.get("/organization-profile/me/profile-picture", {
      params: {
        t: Date.now(),
      },
    });

    const image = response.data?.profileImage || "";

    setProfileImage(image);

    return image;
  };

  /* ===================================================
     LOAD PROFILE
  =================================================== */

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        loadOrganization(),
        loadProfilePicture(),
      ]);

      if (results[0].status === "rejected") {
        throw results[0].reason;
      }

      if (results[1].status === "rejected") {
        console.error("PROFILE PICTURE LOAD ERROR:", results[1].reason);

        setProfileImage("");
      }
    } catch (err) {
      console.error("LOAD PROFILE ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to load organization profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  /* ===================================================
     CALCULATE CROP SCALE
  =================================================== */

  const getBaseScale = () => {
    if (!naturalSize.width || !naturalSize.height) {
      return 1;
    }

    return Math.max(
      CROP_SIZE / naturalSize.width,

      CROP_SIZE / naturalSize.height,
    );
  };

  /* ===================================================
     CLAMP CROP POSITION

     Prevents empty space from appearing
     inside the crop area.
  =================================================== */

  const clampPosition = (x, y, zoomValue = zoom) => {
    if (!naturalSize.width || !naturalSize.height) {
      return {
        x: 0,
        y: 0,
      };
    }

    const scale = getBaseScale() * zoomValue;

    const displayedWidth = naturalSize.width * scale;

    const displayedHeight = naturalSize.height * scale;

    const maxX = Math.max(0, (displayedWidth - CROP_SIZE) / 2);

    const maxY = Math.max(0, (displayedHeight - CROP_SIZE) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),

      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  /* ===================================================
     SELECT IMAGE

     Do NOT save yet.

     First open crop/review modal.
  =================================================== */

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed.");

      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose an image smaller than 8 MB.");

      return;
    }

    setError("");
    setSuccess("");

    if (cropSource) {
      URL.revokeObjectURL(cropSource);
    }

    const source = URL.createObjectURL(file);

    setCropSource(source);

    setZoom(1);

    setCropX(0);

    setCropY(0);

    setNaturalSize({
      width: 0,
      height: 0,
    });

    setShowCrop(true);
  };

  /* ===================================================
     CROP IMAGE LOADED
  =================================================== */

  const handleCropImageLoad = (event) => {
    setNaturalSize({
      width: event.currentTarget.naturalWidth,

      height: event.currentTarget.naturalHeight,
    });

    setCropX(0);
    setCropY(0);
    setZoom(1);
  };

  /* ===================================================
     POINTER DOWN
  =================================================== */

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      active: true,

      startClientX: event.clientX,

      startClientY: event.clientY,

      startCropX: cropX,

      startCropY: cropY,
    };
  };

  /* ===================================================
     POINTER MOVE
  =================================================== */

  const handlePointerMove = (event) => {
    if (!dragRef.current.active) {
      return;
    }

    const nextX =
      dragRef.current.startCropX +
      (event.clientX - dragRef.current.startClientX);

    const nextY =
      dragRef.current.startCropY +
      (event.clientY - dragRef.current.startClientY);

    const clamped = clampPosition(nextX, nextY);

    setCropX(clamped.x);

    setCropY(clamped.y);
  };

  /* ===================================================
     POINTER UP
  =================================================== */

  const handlePointerUp = (event) => {
    dragRef.current.active = false;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore.
    }
  };

  /* ===================================================
     ZOOM
  =================================================== */

  const handleZoomChange = (event) => {
    const nextZoom = Number(event.target.value);

    const clamped = clampPosition(cropX, cropY, nextZoom);

    setZoom(nextZoom);

    setCropX(clamped.x);

    setCropY(clamped.y);
  };

  /* ===================================================
     RESET CROP
  =================================================== */

  const resetCrop = () => {
    setZoom(1);
    setCropX(0);
    setCropY(0);
  };

  /* ===================================================
     CLOSE CROP MODAL
  =================================================== */

  const closeCrop = () => {
    if (uploading) {
      return;
    }

    setShowCrop(false);

    if (cropSource) {
      URL.revokeObjectURL(cropSource);
    }

    setCropSource("");

    setNaturalSize({
      width: 0,
      height: 0,
    });

    resetCrop();
  };

  /* ===================================================
     CREATE CROPPED IMAGE

     Produces a 500 x 500 JPEG.
  =================================================== */

  const createCroppedImage = () => {
    return new Promise((resolve, reject) => {
      const image = cropImageRef.current;

      if (!image || !naturalSize.width || !naturalSize.height) {
        reject(new Error("The picture is not ready yet."));

        return;
      }

      const canvas = document.createElement("canvas");

      canvas.width = OUTPUT_SIZE;

      canvas.height = OUTPUT_SIZE;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Unable to prepare the picture."));

        return;
      }

      const baseScale = getBaseScale();

      const finalScale = baseScale * zoom;

      /*
            The image is positioned by its center.

            Crop box center:
            CROP_SIZE / 2

            Image center:
            crop box center + cropX/cropY
          */

      const sourceWidth = CROP_SIZE / finalScale;

      const sourceHeight = CROP_SIZE / finalScale;

      let sourceX =
        naturalSize.width / 2 - (CROP_SIZE / 2 + cropX) / finalScale;

      let sourceY =
        naturalSize.height / 2 - (CROP_SIZE / 2 + cropY) / finalScale;

      sourceX = Math.max(0, Math.min(naturalSize.width - sourceWidth, sourceX));

      sourceY = Math.max(
        0,
        Math.min(naturalSize.height - sourceHeight, sourceY),
      );

      context.fillStyle = "#FFFFFF";

      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      context.drawImage(
        image,

        sourceX,
        sourceY,

        sourceWidth,
        sourceHeight,

        0,
        0,

        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const result = canvas.toDataURL("image/jpeg", 0.88);

      resolve(result);
    });
  };

  /* ===================================================
     SAVE CROPPED PICTURE
  =================================================== */

  const saveCroppedPicture = async () => {
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const croppedImage = await createCroppedImage();

      /*
          Preview immediately.
        */

      setProfileImage(croppedImage);

      /* =============================================
           SAVE TO DATABASE
        ============================================= */

      const response = await api.put(
        "/organization-profile/me/profile-picture",
        {
          profileImage: croppedImage,
        },
      );

      const returnedImage = response.data?.profileImage || "";

      if (!returnedImage) {
        throw new Error("The server did not return the saved picture.");
      }

      /* =============================================
           VERIFY IT FROM DATABASE
        ============================================= */

      const verifyResponse = await api.get(
        "/organization-profile/me/profile-picture",
        {
          params: {
            t: Date.now(),
          },
        },
      );

      const verifiedImage = verifyResponse.data?.profileImage || "";

      if (!verifiedImage) {
        throw new Error("The picture was not found after saving.");
      }

      setProfileImage(verifiedImage);

      /*
          Tell OrganizationLayout to immediately
          update sidebar + top-right avatar.
        */

      window.dispatchEvent(
        new CustomEvent("organizationProfileImageUpdated", {
          detail: {
            profileImage: verifiedImage,
          },
        }),
      );

      setSuccess("Profile picture saved successfully.");

      setShowCrop(false);

      if (cropSource) {
        URL.revokeObjectURL(cropSource);
      }

      setCropSource("");
    } catch (err) {
      console.error("SAVE PROFILE PICTURE ERROR:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save profile picture.",
      );

      try {
        await loadProfilePicture();
      } catch {
        setProfileImage("");
      }
    } finally {
      setUploading(false);
    }
  };

  /* ===================================================
     REMOVE PROFILE PICTURE
  =================================================== */

  const removeProfileImage = async () => {
    const confirmed = window.confirm(
      "Remove your organization profile picture?",
    );

    if (!confirmed) {
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(
        "/organization-profile/me/profile-picture",
      );

      setProfileImage("");

      /*
          Update sidebar and header immediately.
        */

      window.dispatchEvent(
        new CustomEvent("organizationProfileImageUpdated", {
          detail: {
            profileImage: "",
          },
        }),
      );

      setSuccess(
        response.data?.message || "Profile picture removed successfully.",
      );
    } catch (err) {
      console.error("REMOVE PROFILE PICTURE ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to remove profile picture.",
      );
    } finally {
      setUploading(false);
    }
  };

  /* ===================================================
     OPEN EDIT PROFILE
  =================================================== */

  const openEdit = () => {
    setEditForm({
      adviser: organization.adviser || "",

      contactNumber: organization.contactNumber || "",

      description: organization.description || "",
    });

    setError("");
    setSuccess("");

    setShowEdit(true);
  };

  /* ===================================================
     EDIT CHANGE
  =================================================== */

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,

      [name]: value,
    }));
  };

  /* ===================================================
     SAVE PROFILE INFORMATION
  =================================================== */

  const saveProfile = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put("/organizations/me", {
        adviser: editForm.adviser.trim(),

        contactNumber: editForm.contactNumber.trim(),

        description: editForm.description.trim(),
      });

      const updated = response.data?.organization || {};

      setOrganization((previous) => ({
        ...previous,
        ...updated,
      }));

      /*
          Tell layout that organization details
          may have changed.
        */

      window.dispatchEvent(new CustomEvent("organizationProfileUpdated"));

      setShowEdit(false);

      setSuccess(
        response.data?.message || "Organization profile updated successfully.",
      );
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);

      setError(
        err.response?.data?.message || "Unable to update organization profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===================================================
     LOGOUT
  =================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");

    localStorage.removeItem("role");

    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
    });
  };

  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          items-center
          justify-center
        "
      >
        <div
          className="
            text-center
          "
        >
          <MaterialIcon
            name="hourglass_top"
            className="
              text-[30px]
              text-yellow-500
            "
          />

          <p
            className="
              mt-3
              text-[11px]
              font-bold
              text-blue-950
            "
          >
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <>
      <div
        className="
          mx-auto
          w-full
          max-w-[900px]
          space-y-5
        "
      >
        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <motion.section
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="
            overflow-hidden
            rounded-[20px]

            bg-gradient-to-r
            from-[#0B1A38]
            via-[#0B294B]
            to-[#144C7A]

            px-7
            py-7

            text-white
            shadow-sm
          "
        >
          <div
            className="
              flex
              flex-col
              items-center
              gap-7

              md:flex-row
            "
          >
            {/* ===========================================
                PROFILE PICTURE
            ============================================ */}

            <div
              className="
                shrink-0
                text-center
              "
            >
              <div
                className="
                  relative

                  flex
                  h-[115px]
                  w-[115px]
                  items-center
                  justify-center

                  overflow-hidden

                  rounded-full

                  border-[3px]
                  border-yellow-300

                  shadow-lg
                "
                style={{
                  backgroundColor: organization.color || "#FACC15",
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={`${organization.organizationName} Profile`}
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                ) : (
                  <span
                    className="
                      text-[28px]
                      font-black
                      text-blue-950
                    "
                  >
                    {initials}
                  </span>
                )}

                {uploading && (
                  <div
                    className="
                      absolute
                      inset-0

                      flex
                      items-center
                      justify-center

                      bg-blue-950/70
                    "
                  >
                    <MaterialIcon
                      name="hourglass_top"
                      className="
                        animate-pulse
                        text-[25px]
                        text-white
                      "
                    />
                  </div>
                )}
              </div>

              {/* =========================================
                  SELECT PICTURE
              ========================================== */}

              <label
                className={`
                  mt-3

                  inline-flex
                  cursor-pointer
                  items-center
                  justify-center
                  gap-1.5

                  rounded-full

                  bg-yellow-400

                  px-4
                  py-2

                  text-[10px]
                  font-black
                  text-blue-950

                  shadow-sm

                  transition

                  hover:bg-yellow-300
                  hover:shadow-md

                  ${uploading ? "pointer-events-none opacity-60" : ""}
                `}
              >
                <MaterialIcon
                  name="photo_camera"
                  className="
                    text-[15px]
                  "
                />

                {profileImage ? "Change Picture" : "Add Picture"}

                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                />
              </label>

              {profileImage && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={removeProfileImage}
                  className="
                    mx-auto
                    mt-2
                    block

                    text-[8px]
                    font-bold
                    text-red-200

                    hover:text-white
                  "
                >
                  Remove Picture
                </button>
              )}
            </div>

            {/* ===========================================
                ORGANIZATION INFORMATION
            ============================================ */}

            <div
              className="
                text-center
                md:text-left
              "
            >
              <span
                className="
                  inline-flex

                  rounded-full

                  bg-yellow-400/20

                  px-3
                  py-1

                  text-[9px]
                  font-black
                  text-yellow-300
                "
              >
                Organization Account
              </span>

              <h1
                className="
                  mt-3
                  text-[30px]
                  font-black
                  leading-tight
                "
              >
                {organization.organizationName || "Organization"}
              </h1>

              <p
                className="
                  mt-1
                  text-[12px]
                  font-bold
                  text-gray-200
                "
              >
                {organization.acronym}
              </p>

              <p
                className="
                  mt-4
                  max-w-lg
                  text-[11px]
                  leading-5
                  text-gray-300
                "
              >
                {organization.description ||
                  "No organization description has been added yet."}
              </p>
            </div>
          </div>
        </motion.section>

        {/* =================================================
            INFORMATION CARDS
        ================================================= */}

        <div
          className="
            grid
            gap-4

            md:grid-cols-2
          "
        >
          <InfoCard
            icon="business"
            title="Organization Information"
            items={[
              {
                label: "Organization Name",

                value: organization.organizationName,
              },

              {
                label: "Acronym",

                value: organization.acronym,
              },

              {
                label: "Adviser",

                value: organization.adviser,
              },
            ]}
          />

          <InfoCard
            icon="contact_mail"
            title="Contact Information"
            items={[
              {
                label: "Email Address",

                value: organization.email,
              },

              {
                label: "Contact Number",

                value: organization.contactNumber,
              },
            ]}
          />
        </div>

        {/* =================================================
            ACCOUNT MANAGEMENT
        ================================================= */}

        <section
          className="
            rounded-[20px]

            bg-white

            p-6

            shadow-sm
          "
        >
          <h2
            className="
              text-[20px]
              font-black
              text-blue-950
            "
          >
            Account Management
          </h2>

          <p
            className="
              mt-1
              text-[11px]
              text-gray-500
            "
          >
            Manage your organization information and account.
          </p>

          <div
            className="
              mt-5

              grid
              gap-3

              sm:grid-cols-2
            "
          >
            <AccountCard
              icon="edit"
              title="Edit Profile"
              description="Update organization information."
              onClick={openEdit}
            />

            <Link
              to="/organization/change-password"
              className="
                rounded-xl
                bg-gray-100
                p-4

                transition

                hover:-translate-y-0.5
                hover:bg-yellow-50
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="lock"
                className="
                  text-[20px]
                  text-yellow-500
                "
              />

              <h3
                className="
                  mt-3
                  text-[12px]
                  font-black
                  text-blue-950
                "
              >
                Change Password
              </h3>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-gray-600
                "
              >
                Update your account security.
              </p>
            </Link>

            <Link
              to="/organization/admin-request"
              className="
                rounded-xl
                bg-gray-100
                p-4

                transition

                hover:-translate-y-0.5
                hover:bg-yellow-50
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="support_agent"
                className="
                  text-[20px]
                  text-yellow-500
                "
              />

              <h3
                className="
                  mt-3
                  text-[12px]
                  font-black
                  text-blue-950
                "
              >
                Admin Request
              </h3>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-gray-600
                "
              >
                Send concerns and requests.
              </p>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="
                rounded-xl
                bg-red-50
                p-4
                text-left

                transition

                hover:-translate-y-0.5
                hover:bg-red-100
                hover:shadow-md
              "
            >
              <MaterialIcon
                name="logout"
                className="
                  text-[20px]
                  text-red-600
                "
              />

              <h3
                className="
                  mt-3
                  text-[12px]
                  font-black
                  text-red-700
                "
              >
                Sign Out
              </h3>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-red-600
                "
              >
                Logout your account.
              </p>
            </button>
          </div>
        </section>
      </div>

      {/* =================================================
          CROP / REVIEW MODAL
      ================================================= */}

      {showCrop && (
        <div
          className="
            fixed
            inset-0
            z-[5000]

            flex
            items-center
            justify-center

            bg-black/75

            p-4

            backdrop-blur-sm
          "
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="
              w-full
              max-w-[520px]

              overflow-hidden

              rounded-[22px]

              bg-white

              shadow-2xl
            "
          >
            {/* ===========================================
                CROP HEADER
            ============================================ */}

            <div
              className="
                flex
                items-start
                justify-between

                border-b
                border-gray-100

                px-5
                py-4
              "
            >
              <div>
                <p
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.15em]
                    text-yellow-600
                  "
                >
                  Review Picture
                </p>

                <h2
                  className="
                    mt-1
                    text-[19px]
                    font-black
                    text-blue-950
                  "
                >
                  Crop Profile Picture
                </h2>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-gray-500
                  "
                >
                  Drag the image to reposition it, then use the slider to zoom.
                </p>
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={closeCrop}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center

                  rounded-full

                  bg-gray-100
                  text-gray-600

                  hover:bg-gray-200
                "
              >
                <MaterialIcon
                  name="close"
                  className="
                    text-[17px]
                  "
                />
              </button>
            </div>

            {/* ===========================================
                CROP WORKSPACE
            ============================================ */}

            <div
              className="
                bg-[#0B1A38]

                px-5
                py-7
              "
            >
              <div
                className="
                  flex
                  justify-center
                "
              >
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="
                    relative

                    h-[280px]
                    w-[280px]

                    cursor-grab

                    overflow-hidden

                    rounded-full

                    border-[4px]
                    border-yellow-400

                    bg-black

                    shadow-2xl

                    active:cursor-grabbing
                  "
                  style={{
                    touchAction: "none",
                  }}
                >
                  {cropSource && (
                    <img
                      ref={cropImageRef}
                      src={cropSource}
                      alt="Crop Preview"
                      draggable="false"
                      onLoad={handleCropImageLoad}
                      className="
                        pointer-events-none

                        absolute
                        left-1/2
                        top-1/2

                        max-w-none

                        select-none
                      "
                      style={{
                        width: naturalSize.width
                          ? `${naturalSize.width * getBaseScale()}px`
                          : "auto",

                        height: naturalSize.height
                          ? `${naturalSize.height * getBaseScale()}px`
                          : "auto",

                        transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${zoom})`,

                        transformOrigin: "center center",
                      }}
                    />
                  )}

                  {/* CENTER GUIDE */}

                  <div
                    className="
                      pointer-events-none

                      absolute
                      inset-0

                      rounded-full

                      ring-1
                      ring-inset
                      ring-white/40
                    "
                  />

                  <div
                    className="
                      pointer-events-none

                      absolute
                      left-1/2
                      top-0

                      h-full
                      w-px

                      -translate-x-1/2

                      bg-white/15
                    "
                  />

                  <div
                    className="
                      pointer-events-none

                      absolute
                      left-0
                      top-1/2

                      h-px
                      w-full

                      -translate-y-1/2

                      bg-white/15
                    "
                  />
                </div>
              </div>

              <p
                className="
                  mt-4
                  text-center
                  text-[9px]
                  font-bold
                  text-blue-200
                "
              >
                Drag the picture inside the circle
              </p>
            </div>

            {/* ===========================================
                ZOOM / CONTROLS
            ============================================ */}

            <div
              className="
                px-5
                py-5
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <MaterialIcon
                    name="zoom_out"
                    className="
                      text-[18px]
                      text-gray-500
                    "
                  />

                  <span
                    className="
                      text-[10px]
                      font-black
                      text-blue-950
                    "
                  >
                    Zoom
                  </span>
                </div>

                <span
                  className="
                    text-[9px]
                    font-bold
                    text-gray-500
                  "
                >
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div
                className="
                  mt-3

                  flex
                  items-center
                  gap-3
                "
              >
                <MaterialIcon
                  name="remove"
                  className="
                    text-[16px]
                    text-gray-400
                  "
                />

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={handleZoomChange}
                  className="
                    w-full
                    accent-yellow-400
                  "
                />

                <MaterialIcon
                  name="add"
                  className="
                    text-[16px]
                    text-gray-400
                  "
                />
              </div>

              <button
                type="button"
                onClick={resetCrop}
                className="
                  mt-3

                  inline-flex
                  items-center
                  gap-1

                  text-[9px]
                  font-bold
                  text-blue-700

                  hover:text-blue-900
                "
              >
                <MaterialIcon
                  name="restart_alt"
                  className="
                    text-[15px]
                  "
                />
                Reset Position
              </button>

              {/* =========================================
                  REVIEW NOTE
              ========================================== */}

              <div
                className="
                  mt-4

                  rounded-xl

                  border
                  border-yellow-200

                  bg-yellow-50

                  p-3
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-2
                  "
                >
                  <MaterialIcon
                    name="visibility"
                    className="
                      mt-0.5
                      text-[16px]
                      text-yellow-600
                    "
                  />

                  <div>
                    <p
                      className="
                        text-[10px]
                        font-black
                        text-blue-950
                      "
                    >
                      Review before saving
                    </p>

                    <p
                      className="
                        mt-1
                        text-[9px]
                        leading-4
                        text-gray-600
                      "
                    >
                      This circular preview shows how your profile picture will
                      appear in your profile, sidebar, and header.
                    </p>
                  </div>
                </div>
              </div>

              {/* =========================================
                  ACTION BUTTONS
              ========================================== */}

              <div
                className="
                  mt-5

                  grid
                  grid-cols-2
                  gap-3
                "
              >
                <button
                  type="button"
                  disabled={uploading}
                  onClick={closeCrop}
                  className="
                    rounded-xl

                    bg-gray-100

                    py-3

                    text-[10px]
                    font-black
                    text-gray-700

                    hover:bg-gray-200

                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={uploading || !naturalSize.width}
                  onClick={saveCroppedPicture}
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2

                    rounded-xl

                    bg-yellow-400

                    py-3

                    text-[10px]
                    font-black
                    text-blue-950

                    hover:bg-yellow-300

                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <MaterialIcon
                    name={uploading ? "hourglass_top" : "check"}
                    className="
                      text-[16px]
                    "
                  />

                  {uploading ? "Saving..." : "Save Picture"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* =================================================
          EDIT PROFILE MODAL
      ================================================= */}

      {showEdit && (
        <div
          className="
            fixed
            inset-0
            z-[4000]

            flex
            items-center
            justify-center

            bg-black/65

            p-4

            backdrop-blur-sm
          "
          onClick={() => {
            if (!saving) {
              setShowEdit(false);
            }
          }}
        >
          <motion.form
            initial={{
              opacity: 0,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            onSubmit={saveProfile}
            onClick={(event) => event.stopPropagation()}
            className="
              w-full
              max-w-lg

              rounded-2xl

              bg-white

              p-5

              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-black
                    uppercase
                    tracking-[0.14em]
                    text-yellow-600
                  "
                >
                  Organization
                </p>

                <h2
                  className="
                    mt-1
                    text-[19px]
                    font-black
                    text-blue-950
                  "
                >
                  Edit Profile
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center

                  rounded-full

                  bg-gray-100
                "
              >
                <MaterialIcon name="close" />
              </button>
            </div>

            <div
              className="
                mt-5
              "
            >
              <FieldLabel>Adviser</FieldLabel>

              <input
                name="adviser"
                value={editForm.adviser}
                onChange={handleEditChange}
                className={inputClass}
              />
            </div>

            <div
              className="
                mt-4
              "
            >
              <FieldLabel>Contact Number</FieldLabel>

              <input
                name="contactNumber"
                value={editForm.contactNumber}
                onChange={handleEditChange}
                className={inputClass}
              />
            </div>

            <div
              className="
                mt-4
              "
            >
              <FieldLabel>Description</FieldLabel>

              <textarea
                name="description"
                value={editForm.description}
                onChange={handleEditChange}
                rows="5"
                className={`
                  ${inputClass}

                  h-auto
                  resize-none
                  py-3
                `}
              />
            </div>

            <div
              className="
                mt-5

                grid
                grid-cols-2
                gap-3
              "
            >
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="
                  rounded-xl

                  bg-gray-100

                  py-2.5

                  text-[10px]
                  font-black
                  text-gray-700
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="
                  rounded-xl

                  bg-yellow-400

                  py-2.5

                  text-[10px]
                  font-black
                  text-blue-950

                  disabled:opacity-50
                "
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </>
  );
}

/* =====================================================
   ACCOUNT CARD
===================================================== */

function AccountCard({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        rounded-xl
        bg-gray-100
        p-4
        text-left

        transition

        hover:-translate-y-0.5
        hover:bg-blue-50
        hover:shadow-md
      "
    >
      <MaterialIcon
        name={icon}
        className="
          text-[20px]
          text-yellow-500
        "
      />

      <h3
        className="
          mt-3
          text-[12px]
          font-black
          text-blue-950
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-1
          text-[10px]
          text-gray-600
        "
      >
        {description}
      </p>
    </button>
  );
}

/* =====================================================
   INPUT
===================================================== */

const inputClass = `
  mt-1.5
  h-10
  w-full

  rounded-xl

  border
  border-gray-200

  px-3

  text-[11px]
  text-blue-950

  outline-none

  focus:border-yellow-400
  focus:ring-2
  focus:ring-yellow-400/20
`;

/* =====================================================
   FIELD LABEL
===================================================== */

function FieldLabel({ children }) {
  return (
    <label
      className="
        text-[10px]
        font-black
        text-blue-950
      "
    >
      {children}
    </label>
  );
}

/* =====================================================
   INFO CARD
===================================================== */

function InfoCard({ icon, title, items }) {
  return (
    <div
      className="
        rounded-[20px]
        bg-white
        p-5
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            items-center
            justify-center

            rounded-xl

            bg-yellow-50
          "
        >
          <MaterialIcon
            name={icon}
            className="
              text-[20px]
              text-yellow-500
            "
          />
        </div>

        <h2
          className="
            pt-1.5
            text-[16px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>
      </div>

      <div
        className="
          mt-5
          space-y-4
        "
      >
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <p
              className="
                  text-[8px]
                  font-bold
                  uppercase
                  text-gray-500
                "
            >
              {item.label}
            </p>

            <p
              className="
                  mt-1
                  break-words

                  text-[11px]
                  font-bold
                  text-blue-950
                "
            >
              {item.value || "Not provided"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================
   ALERT
===================================================== */

function Alert({ type, message, onClose }) {
  const success = type === "success";

  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-3

        rounded-xl

        border

        px-4
        py-3

        text-[10px]
        font-bold

        ${
          success
            ? `
              border-green-200
              bg-green-50
              text-green-700
            `
            : `
              border-red-200
              bg-red-50
              text-red-700
            `
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <MaterialIcon
          name={success ? "check_circle" : "error"}
          className="
            text-[16px]
          "
        />

        <span>{message}</span>
      </div>

      <button type="button" onClick={onClose}>
        <MaterialIcon
          name="close"
          className="
            text-[15px]
          "
        />
      </button>
    </div>
  );
}
