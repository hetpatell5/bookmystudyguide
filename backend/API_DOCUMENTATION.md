# API Documentation - SubDegree & Subject Management

## Updated API Endpoints

### SubDegree Endpoints

#### 1. Get All Sub-Degrees

- **Method:** GET
- **URL:** `/api/subDegrees`
- **Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6547abc123",
      "name": "B.A. Part 1",
      "year": "1",
      "mainDegreeId": {
        "_id": "6547def456",
        "name": "Bachelor of Arts"
      }
    }
  ]
}
```

#### 2. Get Sub-Degrees by MainDegreeId

- **Method:** GET
- **URL:** `/api/subDegrees/byMainDegree/:mainDegreeId`
- **Parameters:** `mainDegreeId` (MongoDB ObjectId)
- **Example:** `/api/subDegrees/byMainDegree/6547def456`
- **Response:**

```json
{
  "success": true,
  "data": [...]
}
```

#### 3. Create New Sub-Degree

- **Method:** POST
- **URL:** `/api/subDegrees`
- **Body:**

```json
{
  "name": "B.A. Part 1",
  "year": "1",
  "mainDegreeId": "6547def456"
}
```

- **Required Fields:** `name`, `mainDegreeId`
- **Optional Fields:** `year`
- **Response:**

```json
{
  "success": true,
  "data": {
    "_id": "6547abc123",
    "name": "B.A. Part 1",
    "year": "1",
    "mainDegreeId": "6547def456"
  },
  "message": "Sub-degree created successfully"
}
```

#### 4. Update Sub-Degree

- **Method:** PUT
- **URL:** `/api/subDegrees/:id`
- **Parameters:** `id` (MongoDB ObjectId)
- **Body:**

```json
{
  "name": "B.A. Part 2",
  "year": "2",
  "mainDegreeId": "6547def456"
}
```

- **Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Sub-degree updated successfully"
}
```

#### 5. Delete Sub-Degree

- **Method:** DELETE
- **URL:** `/api/subDegrees/:id`
- **Parameters:** `id` (MongoDB ObjectId)
- **Response:**

```json
{
  "success": true,
  "message": "Sub-degree deleted successfully"
}
```

---

### Subject Endpoints

#### 1. Get All Subjects

- **Method:** GET
- **URL:** `/api/subjects`
- **Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6547xyz789",
      "name": "English",
      "subDegreeId": {
        "_id": "6547abc123",
        "name": "B.A. Part 1"
      }
    }
  ]
}
```

#### 2. Get Subjects by SubDegreeId

- **Method:** GET
- **URL:** `/api/subjects/bySubDegree/:subDegreeId`
- **Parameters:** `subDegreeId` (MongoDB ObjectId)
- **Example:** `/api/subjects/bySubDegree/6547abc123`
- **Response:**

```json
{
  "success": true,
  "data": [...]
}
```

#### 3. Create New Subject

- **Method:** POST
- **URL:** `/api/subjects`
- **Body:**

```json
{
  "name": "English",
  "subDegreeId": "6547abc123"
}
```

- **Required Fields:** `name`, `subDegreeId`
- **Response:**

```json
{
  "success": true,
  "data": {
    "_id": "6547xyz789",
    "name": "English",
    "subDegreeId": "6547abc123"
  },
  "message": "Subject created successfully"
}
```

#### 4. Update Subject

- **Method:** PUT
- **URL:** `/api/subjects/:id`
- **Parameters:** `id` (MongoDB ObjectId)
- **Body:**

```json
{
  "name": "Advanced English",
  "subDegreeId": "6547abc123"
}
```

- **Response:**

```json
{
  "success": true,
  "data": {...},
  "message": "Subject updated successfully"
}
```

#### 5. Delete Subject

- **Method:** DELETE
- **URL:** `/api/subjects/:id`
- **Parameters:** `id` (MongoDB ObjectId)
- **Response:**

```json
{
  "success": true,
  "message": "Subject deleted successfully"
}
```

---

## Database Schema

### SubDegree Schema

```javascript
{
  name: String (required),
  year: String (optional),
  mainDegreeId: ObjectId (required, references MainDegree)
}
```

### Subject Schema

```javascript
{
  name: String (required),
  subDegreeId: ObjectId (required, references SubDegree)
}
```

---

## Testing Examples

### Using cURL

#### Create a Sub-Degree:

```bash
curl -X POST http://localhost:5000/api/subDegrees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "B.A. Part 1",
    "year": "1",
    "mainDegreeId": "6547def456"
  }'
```

#### Create a Subject:

```bash
curl -X POST http://localhost:5000/api/subjects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "English",
    "subDegreeId": "6547abc123"
  }'
```

#### Get all Sub-Degrees:

```bash
curl http://localhost:5000/api/subDegrees
```

#### Get Subjects for a Sub-Degree:

```bash
curl http://localhost:5000/api/subjects/bySubDegree/6547abc123
```

---

## Error Handling

All endpoints return proper HTTP status codes and error messages:

- `200 OK` - Successful GET, PUT, DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Example error response:

```json
{
  "success": false,
  "message": "name and mainDegreeId are required"
}
```
