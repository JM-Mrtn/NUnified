import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";

import api from "../../api/axiosClient.js";

/* =====================================================
   ICON
===================================================== */

function MaterialIcon({ name, className = "" }) {
  return (
    <span className={`material-symbols-rounded leading-none ${className}`}>
      {name}
    </span>
  );
}

/* =====================================================
   EMPTY FORM
===================================================== */

const EMPTY_FORM = {
  organizationName: "",
  acronym: "",
  email: "",
  contactNumber: "",
  adviser: "",
  description: "",
  color: "#FACC15",
};

/* =====================================================
   VALIDATION REGEX
===================================================== */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/*
  Philippine mobile format:

  09XXXXXXXXX

  Example:
  09387565541

  Exactly 11 digits.
*/
const PHONE_REGEX = /^09\d{9}$/;

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/* =====================================================
   USERNAME
===================================================== */

function generatedUsername(acronym) {
  const clean = String(acronym || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return clean ? `${clean}_eventmanagement` : "organization_eventmanagement";
}

/* =====================================================
   GET USERNAME
===================================================== */

function getUsername(organization) {
  return (
    organization.username ||
    organization.user?.username ||
    organization.loginUsername ||
    ""
  );
}

/* =====================================================
   ORGANIZATION FORM VALIDATION
===================================================== */

function validateOrganizationForm(form) {
  const errors = {};

  const organizationName = String(form.organizationName || "").trim();

  const acronym = String(form.acronym || "").trim();

  const email = String(form.email || "").trim();

  const contactNumber = String(form.contactNumber || "").trim();

  const adviser = String(form.adviser || "").trim();

  const description = String(form.description || "").trim();

  const color = String(form.color || "").trim();

  /* ===================================================
     ORGANIZATION NAME
  =================================================== */

  if (!organizationName) {
    errors.organizationName = "Organization name is required.";
  } else if (organizationName.length < 2) {
    errors.organizationName =
      "Organization name must contain at least 2 characters.";
  } else if (organizationName.length > 100) {
    errors.organizationName =
      "Organization name must not exceed 100 characters.";
  }

  /* ===================================================
     ACRONYM
  =================================================== */

  if (!acronym) {
    errors.acronym = "Acronym is required.";
  } else if (acronym.length < 2) {
    errors.acronym = "Acronym must contain at least 2 characters.";
  } else if (acronym.length > 15) {
    errors.acronym = "Acronym must not exceed 15 characters.";
  } else if (!/^[A-Za-z0-9&.-]+$/.test(acronym)) {
    errors.acronym =
      "Acronym may only contain letters, numbers, &, period, or hyphen.";
  }

  /* ===================================================
     EMAIL
  =================================================== */

  if (!email) {
    errors.email = "Email address is required.";
  } else if (email.length > 254) {
    errors.email = "Email address is too long.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email =
      "Enter a valid email address, for example organization@email.com.";
  }

  /* ===================================================
     CONTACT NUMBER
  =================================================== */

  if (!contactNumber) {
    errors.contactNumber = "Contact number is required.";
  } else if (!PHONE_REGEX.test(contactNumber)) {
    errors.contactNumber =
      "Contact number must be 11 digits and start with 09, for example 09*********.";
  }

  /* ===================================================
     ADVISER
  =================================================== */

  if (!adviser) {
    errors.adviser = "Adviser name is required.";
  } else if (adviser.length < 2) {
    errors.adviser = "Adviser name must contain at least 2 characters.";
  } else if (adviser.length > 100) {
    errors.adviser = "Adviser name must not exceed 100 characters.";
  } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿÑñ\s.'-]+$/.test(adviser)) {
    errors.adviser = "Adviser name contains invalid characters.";
  }

  /* ===================================================
     DESCRIPTION
  =================================================== */

  if (description.length > 500) {
    errors.description = "Description must not exceed 500 characters.";
  }

  /* ===================================================
     COLOR
  =================================================== */

  if (!color) {
    errors.color = "Organization color is required.";
  } else if (!HEX_COLOR_REGEX.test(color)) {
    errors.color = "Enter a valid hex color, for example #FACC15.";
  }

  return errors;
}

/* =====================================================
   PASSWORD VALIDATION FOR ADMIN EDIT

   Password is OPTIONAL.

   But if Admin enters one,
   it must be strong.
===================================================== */

function validateOptionalPassword(password, confirmPassword) {
  if (!password) {
    return "";
  }

  if (password.length < 8) {
    return "Password must contain at least 8 characters.";
  }

  if (password.length > 20) {
    return "Password must not exceed 20 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must contain at least one special character such as @, #, $, or !.";
  }

  if (password !== confirmPassword) {
    return "New password and confirmation do not match.";
  }

  return "";
}

/* =====================================================
   PAGE
===================================================== */

export default function ManageOrganizations() {
  const [organizations, setOrganizations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [working, setWorking] = useState(false);

  const [search, setSearch] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ===================================================
     CREATE
  =================================================== */

  const [showCreate, setShowCreate] = useState(false);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const [createErrors, setCreateErrors] = useState({});

  /* ===================================================
     EDIT
  =================================================== */

  const [editing, setEditing] = useState(null);

  const [editForm, setEditForm] = useState(null);

  const [editErrors, setEditErrors] = useState({});

  /* ===================================================
     REMOVE
  =================================================== */

  const [removeOrg, setRemoveOrg] = useState(null);

  /* ===================================================
     LOAD ORGANIZATIONS
  =================================================== */

  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/organizations");

      const list = Array.isArray(response.data) ? response.data : [];

      /*
          Load profile pictures when available.

          If the profile-picture endpoint fails,
          organization cards will still load.
        */

      const organizationsWithPictures = await Promise.all(
        list.map(async (organization) => {
          try {
            const pictureResponse = await api.get(
              `/organization-profile/admin/${organization._id}/profile-picture`,
              {
                params: {
                  t: Date.now(),
                },
              },
            );

            return {
              ...organization,

              profileImage:
                pictureResponse.data?.profileImage ||
                organization.profileImage ||
                "",
            };
          } catch (pictureError) {
            return {
              ...organization,

              profileImage: organization.profileImage || "",
            };
          }
        }),
      );

      setOrganizations(organizationsWithPictures);
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  /* ===================================================
     SEARCH
  =================================================== */

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return organizations;
    }

    return organizations.filter((org) =>
      [
        org.organizationName,
        org.acronym,
        org.email,
        org.contactNumber,
        org.adviser,
        getUsername(org),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [organizations, search]);

  /* ===================================================
     CREATE INPUT CHANGE
  =================================================== */

  const handleCreateChange = (event) => {
    const { name } = event.target;

    let { value } = event.target;

    /* ===============================================
         CONTACT NUMBER

         Digits only.
         Maximum 11 digits.
      =============================================== */

    if (name === "contactNumber") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    /* ===============================================
         ACRONYM

         Uppercase automatically.
      =============================================== */

    if (name === "acronym") {
      value = value.toUpperCase().slice(0, 15);
    }

    /* ===============================================
         EMAIL

         Remove spaces.
      =============================================== */

    if (name === "email") {
      value = value.replace(/\s/g, "");
    }

    setCreateForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    /*
        Remove that field's error as
        soon as the user starts fixing it.
      */

    setCreateErrors((previous) => ({
      ...previous,

      [name]: "",
    }));

    setError("");
  };

  /* ===================================================
     CREATE ORGANIZATION
  =================================================== */

  const createOrganization = async (event) => {
    event.preventDefault();

    const validationErrors = validateOrganizationForm(createForm);

    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);

      setError(
        "Please correct the highlighted fields before creating the organization.",
      );

      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/organizations", {
        organizationName: createForm.organizationName.trim(),

        acronym: createForm.acronym.trim().toUpperCase(),

        email: createForm.email.trim().toLowerCase(),

        contactNumber: createForm.contactNumber.trim(),

        adviser: createForm.adviser.trim(),

        description: createForm.description.trim(),

        color: createForm.color.trim().toUpperCase(),
      });

      setSuccess(
        response.data?.message ||
          "Organization created successfully. Login credentials were generated and emailed.",
      );

      setShowCreate(false);

      setCreateForm(EMPTY_FORM);

      setCreateErrors({});

      await loadOrganizations();
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Unable to create organization.");
    } finally {
      setWorking(false);
    }
  };

  /* ===================================================
     OPEN EDIT
  =================================================== */

  const openEdit = (organization) => {
    setEditing(organization);

    setEditForm({
      organizationName: organization.organizationName || "",

      acronym: organization.acronym || "",

      email: organization.email || "",

      contactNumber: organization.contactNumber || "",

      adviser: organization.adviser || "",

      description: organization.description || "",

      color: organization.color || "#FACC15",

      password: "",

      confirmPassword: "",
    });

    setEditErrors({});

    setError("");
  };

  /* ===================================================
     EDIT INPUT CHANGE
  =================================================== */

  const handleEditChange = (event) => {
    const { name } = event.target;

    let { value } = event.target;

    if (name === "contactNumber") {
      value = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "acronym") {
      value = value.toUpperCase().slice(0, 15);
    }

    if (name === "email") {
      value = value.replace(/\s/g, "");
    }

    setEditForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    setEditErrors((previous) => ({
      ...previous,

      [name]: "",
    }));

    setError("");
  };

  /* ===================================================
     UPDATE ORGANIZATION
  =================================================== */

  const updateOrganization = async (event) => {
    event.preventDefault();

    if (!editing || !editForm) {
      return;
    }

    const validationErrors = validateOrganizationForm(editForm);

    const passwordError = validateOptionalPassword(
      editForm.password,
      editForm.confirmPassword,
    );

    if (passwordError) {
      validationErrors.password = passwordError;
    }

    if (editForm.password && !editForm.confirmPassword) {
      validationErrors.confirmPassword = "Please confirm the new password.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setEditErrors(validationErrors);

      setError("Please correct the highlighted fields before saving.");

      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        organizationName: editForm.organizationName.trim(),

        acronym: editForm.acronym.trim().toUpperCase(),

        email: editForm.email.trim().toLowerCase(),

        contactNumber: editForm.contactNumber.trim(),

        adviser: editForm.adviser.trim(),

        description: editForm.description.trim(),

        color: editForm.color.trim().toUpperCase(),
      };

      if (editForm.password) {
        payload.password = editForm.password;
      }

      const response = await api.put(`/organizations/${editing._id}`, payload);

      setSuccess(
        response.data?.message || "Organization updated successfully.",
      );

      setEditing(null);

      setEditForm(null);

      setEditErrors({});

      await loadOrganizations();
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Unable to update organization.");
    } finally {
      setWorking(false);
    }
  };

  /* ===================================================
     DELETE ORGANIZATION
  =================================================== */

  const deleteOrganization = async () => {
    if (!removeOrg) {
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/organizations/${removeOrg._id}`);

      setSuccess(
        response.data?.message || "Organization removed successfully.",
      );

      setRemoveOrg(null);

      await loadOrganizations();
    } catch (err) {
      console.error(err);

      setError(err.response?.data?.message || "Unable to remove organization.");
    } finally {
      setWorking(false);
    }
  };

  /* ===================================================
     PAGE
  =================================================== */

  return (
    <>
      <div
        className="
          mx-auto
          w-full
          max-w-[1050px]
          space-y-5
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <motion.section
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="
            rounded-[20px]

            bg-gradient-to-r
            from-[#020617]
            via-[#001F3F]
            to-[#064477]

            px-6
            py-5

            text-white
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4

              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <p
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-yellow-400
                "
              >
                Administrator
              </p>

              <h1
                className="
                  mt-1.5
                  text-[26px]
                  font-black
                "
              >
                Manage Organizations
              </h1>

              <p
                className="
                  mt-1.5
                  text-[11px]
                  text-blue-100
                "
              >
                Create, edit, identify, and remove organization accounts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreate(true);

                setCreateForm(EMPTY_FORM);

                setCreateErrors({});

                setError("");
              }}
              className="
                flex
                h-9
                items-center
                justify-center
                gap-1.5

                rounded-full

                bg-yellow-400

                px-4

                text-[11px]
                font-black
                text-blue-950

                transition

                hover:-translate-y-0.5
                hover:bg-yellow-300
              "
            >
              <MaterialIcon name="add" className="text-[16px]" />
              Add Organization
            </button>
          </div>
        </motion.section>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {success && (
          <Message type="success" text={success} close={() => setSuccess("")} />
        )}

        {error && (
          <Message type="error" text={error} close={() => setError("")} />
        )}

        {/* =================================================
            SEARCH
        ================================================= */}

        <div
          className="
            mx-auto
            w-full
            max-w-[980px]

            rounded-2xl

            bg-white

            p-3.5

            shadow-sm
          "
        >
          <div
            className="
              flex
              items-center
              gap-2

              rounded-xl

              bg-gray-100

              px-3
            "
          >
            <MaterialIcon name="search" className="text-[18px]" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search organization..."
              className="
                h-10
                w-full
                bg-transparent
                text-[12px]
                outline-none
              "
            />
          </div>
        </div>

        {/* =================================================
            ORGANIZATION CARDS
        ================================================= */}

        <div
          className="
            mx-auto

            grid
            w-full
            max-w-[980px]

            gap-4

            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {loading ? (
            <div
              className="
                col-span-full

                rounded-2xl

                bg-white

                py-12

                text-center
                text-sm
                text-gray-400
              "
            >
              Loading organizations...
            </div>
          ) : filteredOrganizations.length > 0 ? (
            filteredOrganizations.map((organization) => {
              const color = organization.color || "#FACC15";

              const username = getUsername(organization);

              return (
                <motion.article
                  key={organization._id}
                  initial={{
                    opacity: 0,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="
                      overflow-hidden

                      rounded-2xl

                      bg-white

                      shadow-[0_4px_14px_rgba(15,23,42,0.08)]
                    "
                >
                  <div
                    className="h-1"
                    style={{
                      backgroundColor: color,
                    }}
                  />

                  <div
                    className="
                        p-4
                      "
                  >
                    {/* =================================
                          ORG HEADER
                      ================================= */}

                    <div
                      className="
                          flex
                          items-center
                          gap-3
                        "
                    >
                      <div
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center

                            overflow-hidden

                            rounded-full

                            text-[10px]
                            font-black
                            text-blue-950

                            shadow-sm
                          "
                        style={{
                          backgroundColor: color,
                        }}
                      >
                        {organization.profileImage ? (
                          <img
                            src={organization.profileImage}
                            alt={`${organization.organizationName} Profile`}
                            className="
                                h-full
                                w-full
                                object-cover
                                object-center
                              "
                          />
                        ) : (
                          <span>{organization.acronym || "NU"}</span>
                        )}
                      </div>

                      <div
                        className="
                            min-w-0
                          "
                      >
                        <h2
                          className="
                              truncate

                              text-[13px]
                              font-black
                              text-blue-950
                            "
                        >
                          {organization.organizationName}
                        </h2>

                        <p
                          className="
                              mt-0.5

                              text-[9px]
                              text-gray-400
                            "
                        >
                          {organization.acronym || "Organization"}
                        </p>
                      </div>
                    </div>

                    {/* =================================
                          INFO
                      ================================= */}

                    <div
                      className="
                          mt-3

                          space-y-2

                          rounded-xl

                          bg-gray-50

                          p-3
                        "
                    >
                      <SmallInfo
                        icon="mail"
                        text={organization.email || "No email"}
                      />

                      <SmallInfo
                        icon="person"
                        text={organization.adviser || "No adviser"}
                      />

                      <SmallInfo
                        icon="call"
                        text={organization.contactNumber || "No contact"}
                      />

                      <SmallInfo
                        icon="account_circle"
                        text={
                          username || generatedUsername(organization.acronym)
                        }
                      />

                      <div
                        className="
                            flex
                            items-center
                            gap-2

                            text-[9px]
                            font-bold
                            text-gray-600
                          "
                      >
                        <span
                          className="
                              h-2.5
                              w-2.5
                              rounded-full
                            "
                          style={{
                            backgroundColor: color,
                          }}
                        />

                        {color}
                      </div>
                    </div>

                    {/* =================================
                          ACTIONS
                      ================================= */}

                    <div
                      className="
                          mt-3

                          grid
                          grid-cols-2
                          gap-2
                        "
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(organization)}
                        className="
                            flex
                            h-9
                            items-center
                            justify-center
                            gap-1.5

                            rounded-lg

                            bg-blue-50

                            text-[10px]
                            font-black
                            text-blue-700

                            hover:bg-blue-100
                          "
                      >
                        <MaterialIcon name="edit" className="text-[15px]" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setRemoveOrg(organization)}
                        className="
                            flex
                            h-9
                            items-center
                            justify-center
                            gap-1.5

                            rounded-lg

                            bg-red-50

                            text-[10px]
                            font-black
                            text-red-600

                            hover:bg-red-100
                          "
                      >
                        <MaterialIcon name="delete" className="text-[15px]" />
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div
              className="
                col-span-full

                rounded-2xl

                bg-white

                py-12

                text-center
                text-sm
                text-gray-400
              "
            >
              No organizations found.
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          CREATE ORGANIZATION MODAL
      ================================================= */}

      {showCreate && (
        <Modal
          onClose={() => {
            if (working) {
              return;
            }

            setShowCreate(false);

            setCreateErrors({});
          }}
        >
          <ModalTitle
            title="Add Organization"
            description="Create the organization. NUnified will automatically generate the login account."
            onClose={() => {
              setShowCreate(false);

              setCreateErrors({});
            }}
          />

          <form
            onSubmit={createOrganization}
            noValidate
            className="
              p-5
            "
          >
            {/* =============================================
                REQUIRED INFO MESSAGE
            ============================================= */}

            <div
              className="
                mb-4

                flex
                items-start
                gap-2

                rounded-xl

                border
                border-blue-100

                bg-blue-50

                p-3
              "
            >
              <MaterialIcon
                name="info"
                className="
                  mt-0.5
                  text-[16px]
                  text-blue-600
                "
              />

              <p
                className="
                  text-[9px]
                  leading-5
                  text-blue-700
                "
              >
                Fields marked with <strong className="text-red-500">*</strong>{" "}
                are required. Contact number must use the Philippine mobile
                format <strong>09XXXXXXXXX</strong>.
              </p>
            </div>

            <div
              className="
                grid
                gap-3

                sm:grid-cols-2
              "
            >
              {/* ===========================================
                  ORGANIZATION NAME
              =========================================== */}

              <Field
                label="Organization Name"
                required
                name="organizationName"
                value={createForm.organizationName}
                onChange={handleCreateChange}
                maxLength={100}
                error={createErrors.organizationName}
              />

              {/* ===========================================
                  ACRONYM
              =========================================== */}

              <Field
                label="Acronym"
                required
                name="acronym"
                value={createForm.acronym}
                onChange={handleCreateChange}
                maxLength={15}
                error={createErrors.acronym}
                help="2–15 characters"
              />

              {/* ===========================================
                  EMAIL
              =========================================== */}

              <Field
                label="Email"
                required
                type="email"
                name="email"
                value={createForm.email}
                onChange={handleCreateChange}
                maxLength={254}
                placeholder="organization@email.com"
                autoComplete="email"
                error={createErrors.email}
                help="Login credentials will be sent to this email."
              />

              {/* ===========================================
                  CONTACT NUMBER
              =========================================== */}

              <Field
                label="Contact Number"
                required
                type="tel"
                name="contactNumber"
                value={createForm.contactNumber}
                onChange={handleCreateChange}
                maxLength={11}
                inputMode="numeric"
                autoComplete="tel"
                placeholder="09*********"
                error={createErrors.contactNumber}
                help="11 digits, must start with 09."
              />

              {/* ===========================================
                  ADVISER
              =========================================== */}

              <Field
                label="Adviser"
                required
                name="adviser"
                value={createForm.adviser}
                onChange={handleCreateChange}
                maxLength={100}
                placeholder="Full name of adviser"
                error={createErrors.adviser}
              />

              {/* ===========================================
                  COLOR
              =========================================== */}

              <div>
                <FieldLabel required>Organization Color</FieldLabel>

                <div
                  className="
                    mt-1.5

                    flex
                    gap-2
                  "
                >
                  <input
                    type="color"
                    name="color"
                    value={createForm.color}
                    onChange={handleCreateChange}
                    className="
                      h-10
                      w-12

                      shrink-0

                      cursor-pointer

                      rounded-lg

                      border
                      border-gray-200

                      bg-white

                      p-1
                    "
                  />

                  <input
                    name="color"
                    value={createForm.color}
                    onChange={handleCreateChange}
                    maxLength={7}
                    placeholder="#FACC15"
                    className={`
                      h-10
                      min-w-0
                      flex-1

                      rounded-lg

                      border

                      px-3

                      text-[11px]

                      outline-none

                      ${
                        createErrors.color
                          ? "border-red-400 bg-red-50"
                          : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      }
                    `}
                  />
                </div>

                {createErrors.color && (
                  <FieldError>{createErrors.color}</FieldError>
                )}
              </div>
            </div>

            {/* =============================================
                DESCRIPTION
            ============================================= */}

            <div
              className="
                mt-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-2
                "
              >
                <FieldLabel>Description</FieldLabel>

                <span
                  className={`
                    text-[8px]

                    ${
                      createForm.description.length > 500
                        ? "text-red-600"
                        : "text-gray-400"
                    }
                  `}
                >
                  {createForm.description.length}
                  /500
                </span>
              </div>

              <textarea
                name="description"
                rows="3"
                maxLength={500}
                value={createForm.description}
                onChange={handleCreateChange}
                placeholder="Brief description of the organization..."
                className={`
                  mt-1.5

                  w-full

                  resize-none

                  rounded-lg

                  border

                  p-3

                  text-[11px]

                  outline-none

                  ${
                    createErrors.description
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  }
                `}
              />

              {createErrors.description && (
                <FieldError>{createErrors.description}</FieldError>
              )}

              <p
                className="
                  mt-1
                  text-[8px]
                  text-gray-400
                "
              >
                Optional. Maximum 500 characters.
              </p>
            </div>

            {/* =============================================
                AUTOMATIC LOGIN ACCOUNT
            ============================================= */}

            <div
              className="
                mt-4

                rounded-xl

                border
                border-blue-100

                bg-blue-50

                p-3
              "
            >
              <p
                className="
                  text-[10px]
                  font-black
                  text-blue-950
                "
              >
                Automatic Login Account
              </p>

              <p
                className="
                  mt-2
                  text-[9px]
                  text-gray-500
                "
              >
                Generated Username
              </p>

              <p
                className="
                  mt-1

                  rounded-lg

                  bg-white

                  px-3
                  py-2

                  text-[11px]
                  font-black
                  text-blue-950
                "
              >
                {generatedUsername(createForm.acronym)}
              </p>

              <p
                className="
                  mt-2

                  text-[9px]
                  leading-4
                  text-gray-500
                "
              >
                A secure temporary password will be generated by the backend and
                emailed to the organization's validated email address.
              </p>
            </div>

            {/* =============================================
                CREATE
            ============================================= */}

            <button
              type="submit"
              disabled={working}
              className="
                mt-4

                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2

                rounded-xl

                bg-yellow-400

                text-[11px]
                font-black
                text-blue-950

                transition

                hover:bg-yellow-300

                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              <MaterialIcon
                name={working ? "hourglass_top" : "add_business"}
                className="text-[17px]"
              />

              {working ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </Modal>
      )}

      {/* =================================================
          EDIT ORGANIZATION
      ================================================= */}

      {editing && editForm && (
        <Modal
          onClose={() => {
            if (working) {
              return;
            }

            setEditing(null);

            setEditForm(null);

            setEditErrors({});
          }}
        >
          <ModalTitle
            title="Edit Organization"
            description="Update organization information or assign a new password."
            onClose={() => {
              setEditing(null);

              setEditForm(null);

              setEditErrors({});
            }}
          />

          <form
            onSubmit={updateOrganization}
            noValidate
            className="
                p-5
              "
          >
            <div
              className="
                  grid
                  gap-3

                  sm:grid-cols-2
                "
            >
              <Field
                label="Organization Name"
                required
                name="organizationName"
                value={editForm.organizationName}
                onChange={handleEditChange}
                maxLength={100}
                error={editErrors.organizationName}
              />

              <Field
                label="Acronym"
                required
                name="acronym"
                value={editForm.acronym}
                onChange={handleEditChange}
                maxLength={15}
                error={editErrors.acronym}
              />

              <Field
                label="Email"
                required
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
                maxLength={254}
                error={editErrors.email}
              />

              <Field
                label="Contact Number"
                required
                type="tel"
                name="contactNumber"
                value={editForm.contactNumber}
                onChange={handleEditChange}
                maxLength={11}
                inputMode="numeric"
                placeholder="09*********"
                error={editErrors.contactNumber}
                help="11 digits, must start with 09."
              />

              <Field
                label="Adviser"
                required
                name="adviser"
                value={editForm.adviser}
                onChange={handleEditChange}
                maxLength={100}
                error={editErrors.adviser}
              />

              {/* =========================================
                    COLOR
                ========================================= */}

              <div>
                <FieldLabel required>Organization Color</FieldLabel>

                <div
                  className="
                      mt-1.5

                      flex
                      gap-2
                    "
                >
                  <input
                    type="color"
                    name="color"
                    value={editForm.color}
                    onChange={handleEditChange}
                    className="
                        h-10
                        w-12

                        shrink-0

                        cursor-pointer

                        rounded-lg

                        border
                        border-gray-200

                        p-1
                      "
                  />

                  <input
                    name="color"
                    value={editForm.color}
                    onChange={handleEditChange}
                    maxLength={7}
                    className={`
                        h-10
                        min-w-0
                        flex-1

                        rounded-lg

                        border

                        px-3

                        text-[11px]

                        outline-none

                        ${
                          editErrors.color
                            ? "border-red-400 bg-red-50"
                            : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        }
                      `}
                  />
                </div>

                {editErrors.color && (
                  <FieldError>{editErrors.color}</FieldError>
                )}
              </div>
            </div>

            {/* ===========================================
                  DESCRIPTION
              =========================================== */}

            <div
              className="
                  mt-3
                "
            >
              <div
                className="
                    flex
                    items-center
                    justify-between
                  "
              >
                <FieldLabel>Description</FieldLabel>

                <span
                  className="
                      text-[8px]
                      text-gray-400
                    "
                >
                  {editForm.description.length}
                  /500
                </span>
              </div>

              <textarea
                name="description"
                rows="3"
                maxLength={500}
                value={editForm.description}
                onChange={handleEditChange}
                className={`
                    mt-1.5

                    w-full

                    resize-none

                    rounded-lg

                    border

                    p-3

                    text-[11px]

                    outline-none

                    ${
                      editErrors.description
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    }
                  `}
              />

              {editErrors.description && (
                <FieldError>{editErrors.description}</FieldError>
              )}
            </div>

            {/* ===========================================
                  PASSWORD
              =========================================== */}

            <div
              className="
                  mt-4

                  border-t
                  border-gray-200

                  pt-4
                "
            >
              <p
                className="
                    text-[11px]
                    font-black
                    text-blue-950
                  "
              >
                Change Password
              </p>

              <p
                className="
                    mt-1

                    text-[9px]
                    text-gray-400
                  "
              >
                Leave both password fields blank to keep the organization's
                current password.
              </p>

              <div
                className="
                    mt-3

                    grid
                    gap-3

                    sm:grid-cols-2
                  "
              >
                <Field
                  label="New Password"
                  type="password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                  maxLength={20}
                  error={editErrors.password}
                  help="8–20 characters with uppercase, lowercase and special character."
                />

                <Field
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={editForm.confirmPassword}
                  onChange={handleEditChange}
                  maxLength={20}
                  error={editErrors.confirmPassword}
                />
              </div>
            </div>

            {/* ===========================================
                  SAVE
              =========================================== */}

            <button
              type="submit"
              disabled={working}
              className="
                  mt-4

                  flex
                  h-10
                  w-full
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-yellow-400

                  text-[11px]
                  font-black
                  text-blue-950

                  hover:bg-yellow-300

                  disabled:opacity-60
                "
            >
              <MaterialIcon
                name={working ? "hourglass_top" : "save"}
                className="text-[17px]"
              />

              {working ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </Modal>
      )}

      {/* =================================================
          REMOVE CONFIRMATION
      ================================================= */}

      {removeOrg && (
        <ConfirmModal
          title="Remove Organization?"
          description={`This will remove ${removeOrg.organizationName}.`}
          confirmText="Remove Organization"
          working={working}
          onCancel={() => setRemoveOrg(null)}
          onConfirm={deleteOrganization}
        />
      )}
    </>
  );
}

/* =====================================================
   FIELD LABEL
===================================================== */

function FieldLabel({ children, required = false }) {
  return (
    <label
      className="
        text-[10px]
        font-black
        text-blue-950
      "
    >
      {children}

      {required && (
        <span
          className="
            ml-1
            text-red-500
          "
        >
          *
        </span>
      )}
    </label>
  );
}

/* =====================================================
   FIELD
===================================================== */

function Field({ label, required = false, error = "", help = "", ...props }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>

      <input
        {...props}
        className={`
          mt-1.5

          h-10
          w-full

          rounded-lg

          border

          px-3

          text-[11px]

          outline-none

          transition

          ${
            error
              ? `
                border-red-400
                bg-red-50

                focus:border-red-500
                focus:ring-2
                focus:ring-red-100
              `
              : `
                border-gray-200

                focus:border-blue-500
                focus:ring-2
                focus:ring-blue-500/10
              `
          }
        `}
      />

      {error ? (
        <FieldError>{error}</FieldError>
      ) : help ? (
        <p
          className="
            mt-1

            text-[8px]
            leading-4
            text-gray-400
          "
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

/* =====================================================
   FIELD ERROR
===================================================== */

function FieldError({ children }) {
  return (
    <p
      className="
        mt-1

        flex
        items-start
        gap-1

        text-[8px]
        font-bold
        leading-4
        text-red-600
      "
    >
      <MaterialIcon
        name="error"
        className="
          mt-[1px]
          text-[11px]
        "
      />

      <span>{children}</span>
    </p>
  );
}

/* =====================================================
   SMALL INFO
===================================================== */

function SmallInfo({ icon, text }) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-2

        text-[9px]
        text-gray-600
      "
    >
      <MaterialIcon
        name={icon}
        className="
          shrink-0

          text-[14px]
          text-gray-400
        "
      />

      <span
        className="
          truncate
        "
      >
        {text}
      </span>
    </div>
  );
}

/* =====================================================
   MESSAGE
===================================================== */

function Message({ type, text, close }) {
  const good = type === "success";

  return (
    <div
      className={`
        mx-auto

        flex
        w-full
        max-w-[980px]
        items-center
        justify-between
        gap-3

        rounded-xl

        border

        px-4
        py-3

        text-[11px]
        font-bold

        ${
          good
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
          name={good ? "check_circle" : "error"}
          className="text-[16px]"
        />

        <span>{text}</span>
      </div>

      <button type="button" onClick={close}>
        <MaterialIcon name="close" className="text-[16px]" />
      </button>
    </div>
  );
}

/* =====================================================
   MODAL
===================================================== */

function Modal({ children, onClose }) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[5000]

        flex
        items-center
        justify-center

        bg-black/65

        p-4

        backdrop-blur-sm
      "
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.97,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) => event.stopPropagation()}
        className="
          max-h-[92vh]
          w-full
          max-w-[560px]

          overflow-y-auto

          rounded-2xl

          bg-white

          shadow-2xl
        "
      >
        {children}
      </motion.div>
    </div>
  );
}

/* =====================================================
   MODAL TITLE
===================================================== */

function ModalTitle({ title, description, onClose }) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4

        border-b
        border-gray-200

        p-5
      "
    >
      <div>
        <p
          className="
            text-[8px]
            font-black
            uppercase
            tracking-[0.15em]
            text-yellow-600
          "
        >
          Administrator
        </p>

        <h2
          className="
            mt-1

            text-[18px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-1

            text-[9px]
            text-gray-400
          "
        >
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="
          flex
          h-8
          w-8
          items-center
          justify-center

          rounded-full

          bg-gray-100

          hover:bg-gray-200
        "
      >
        <MaterialIcon name="close" className="text-[17px]" />
      </button>
    </div>
  );
}

/* =====================================================
   CONFIRM MODAL
===================================================== */

function ConfirmModal({
  title,
  description,
  confirmText,
  working,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal onClose={working ? undefined : onCancel}>
      <div
        className="
          p-5
        "
      >
        <div
          className="
            flex
            h-10
            w-10
            items-center
            justify-center

            rounded-xl

            bg-red-100

            text-red-600
          "
        >
          <MaterialIcon name="warning" className="text-[20px]" />
        </div>

        <h2
          className="
            mt-4

            text-[18px]
            font-black
            text-blue-950
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-2

            text-[11px]
            text-gray-500
          "
        >
          {description}
        </p>

        <div
          className="
            mt-5

            grid
            grid-cols-2
            gap-2
          "
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="
              h-10

              rounded-xl

              bg-gray-100

              text-[11px]
              font-black

              hover:bg-gray-200
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="
              h-10

              rounded-xl

              bg-red-600

              text-[11px]
              font-black
              text-white

              hover:bg-red-700

              disabled:opacity-60
            "
          >
            {working ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
