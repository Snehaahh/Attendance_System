import cv2
import insightface
import numpy as np
import matplotlib.pyplot as plt


# -----------------------------
# Step 1: Load ArcFace model (CPU mode)
# -----------------------------
app = insightface.app.FaceAnalysis(
    name='buffalo_l', root="C:/Users/SNEHA/Desktop/Main/insightface")
app.prepare(ctx_id=-1, det_size=(640, 640))

# -----------------------------
# Step 2: Create Student Database from Reference Photo
# -----------------------------

ref_img = cv2.imread("students/snehamol/ref1.jpg")
faces = app.get(ref_img)

if len(faces) == 0:
    raise ValueError("No face detected in reference photo!")

# Extract embedding
embedding = faces[0].embedding
student_db = {"Snehamol": embedding}
print("Student database created with reference photo.")

# -----------------------------
# Step 3: Define Cosine Similarity Function
# -----------------------------


def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


threshold = 0.6  # tune this for stricter/looser matching

# -----------------------------
# Step 4: Real-Time Webcam Detection & Recognition
# -----------------------------
cap = cv2.VideoCapture(0)  # 0 = default webcam

while True:
    ret, frame = cap.read()
    if not ret:
        break

    faces = app.get(frame)
    for face in faces:
        # Draw bounding box
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Compare embedding with database
        live_embedding = face.embedding
        score = cosine_similarity(live_embedding, student_db["Snehamol"])

        if score > threshold:
            label = "Recognized: Snehamol"
        else:
            label = "Unknown"

        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    plt.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    plt.axis("off")
    plt.show()

    if not ret or cv2.getWindowProperty("Webcam - ArcFace Recognition", cv2.WND_PROP_VISIBLE) < 1:
        break


cap.release()
cv2.destroyAllWindows()
