# Sandboxed Code Execution Backend (Judge0 CE Integration)

This document describes the backend architecture, environment configuration, and execution pipeline for **CodeRush (Round 2)** in **Déjà vu – Technical Event**.

---

## 1. Security Architecture Principles

1. **Zero Client-Side Execution**:
   - Participant code is **never** executed inside the browser.
   - `eval()`, `Function()`, and iframe execution are strictly prohibited.
   - All code is treated as untrusted and evaluated inside an isolated Judge0 CE container.

2. **Backend Proxy & Isolation**:
   - The browser communicates **only** with the internal backend execution endpoints (`/api/code/run` and `/api/code/submit`).
   - The frontend never connects directly to Judge0 CE or possesses any Judge0 secrets.
   - Rate limiting, code size validation, and team authorization checks are strictly enforced before any request touches Judge0.

3. **Hidden Test Cases Protection**:
   - Contestants never receive hidden test inputs or expected outputs.
   - When submitting solutions, the backend grades each test case against hidden inputs and returns **only**:
     `{ testCaseIndex: number, status: 'Passed' | 'Failed' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' }`

4. **Authoritative Scoring**:
   - Contestants cannot submit their own score.
   - Scores are computed server-side based on either:
     - **Partial Scoring**: `score = Math.round(points * passed_tests / total_tests)`
     - **All-or-Nothing Scoring**: `score = (passed_tests === total_tests ? points : 0)`
   - Configurable by event administrators.

---

## 2. Environment Variables

Store configuration in `.env` (or pass via cloud environment variables):

| Variable | Description | Default |
|---|---|---|
| `JUDGE0_API_URL` | Root URL of the sandboxed Judge0 CE instance | `http://localhost:2358` |
| `JUDGE0_API_KEY` | RapidAPI key if using RapidAPI-hosted Judge0 CE | *(empty)* |
| `JUDGE0_API_HOST` | RapidAPI host header | `judge0-ce.p.rapidapi.com` |
| `JUDGE0_AUTH_TOKEN` | Token for self-hosted Judge0 instances requiring `X-Auth-Token` | *(empty)* |

---

## 3. Supported Languages & Judge0 IDs

| Language | Judge0 CE Language ID | Compiler / Runtime |
|---|---|---|
| **Python** | `71` | Python (3.8.1) |
| **C** | `50` | C (GCC 9.2.0) |
| **C++** | `54` | C++ (GCC 9.2.0) |
| **Java** | `62` | Java (OpenJDK 13.0.1 - Main class required) |
| **R** | `80` | R (4.0.0) |

---

## 4. Judge0 API Request & Response Specification

### Request Format
When running or grading code, the backend makes an HTTP POST request to:
```
POST ${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true
```

**Headers**:
```http
Content-Type: application/json
X-RapidAPI-Key: <JUDGE0_API_KEY> (if set)
X-RapidAPI-Host: <JUDGE0_API_HOST> (if set)
X-Auth-Token: <JUDGE0_AUTH_TOKEN> (if set)
```

**JSON Payload**:
```json
{
  "source_code": "import sys\nprint('Hello World')",
  "language_id": 71,
  "stdin": "sample input",
  "cpu_time_limit": 2.0,
  "memory_limit": 128000
}
```

### Response Format
Judge0 returns:
```json
{
  "stdout": "Hello World\n",
  "stderr": null,
  "compile_output": null,
  "message": null,
  "time": "0.032",
  "memory": 11340,
  "status": {
    "id": 3,
    "description": "Accepted"
  }
}
```

**Key Status Codes**:
- `3`: Accepted
- `4`: Wrong Answer
- `5`: Time Limit Exceeded
- `6`: Compilation Error
- `7-12`: Runtime Error (SIGSEGV, NZEC, etc.)
- `13`: Internal Error
- `14`: Exec Format Error

---

## 5. Application API Endpoints

### 1. `POST /api/code/run`
Runs participant code against user-provided stdin.
- **Request**:
  ```json
  {
    "teamId": "T01",
    "language": "python",
    "sourceCode": "...",
    "stdin": "4 6\n4 2 2 6"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "stdout": "4\n",
    "stderr": "",
    "compile_output": "",
    "time": "0.045",
    "memory": 12840,
    "status": "Accepted",
    "judge0Connected": true
  }
  ```

### 2. `POST /api/code/submit`
Authoritatively evaluates code against all hidden test cases.
- **Request**:
  ```json
  {
    "teamId": "T01",
    "problemId": "P1",
    "language": "python",
    "sourceCode": "..."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "submissionId": "sub_1700000000000_1",
    "problemId": "P1",
    "problemName": "Subarray XOR Equality",
    "status": "Accepted",
    "score": 25,
    "maxScore": 25,
    "passedCount": 5,
    "totalCount": 5,
    "testResults": [
      { "testCaseIndex": 1, "status": "Passed", "executionTime": "0.03s" },
      { "testCaseIndex": 2, "status": "Passed", "executionTime": "0.02s" },
      { "testCaseIndex": 3, "status": "Passed", "executionTime": "0.04s" },
      { "testCaseIndex": 4, "status": "Passed", "executionTime": "0.02s" },
      { "testCaseIndex": 5, "status": "Passed", "executionTime": "0.03s" }
    ],
    "submittedAt": 1700000000000
  }
  ```

### 3. `GET /api/code/status`
Checks Judge0 connectivity and execution engine status.

### 4. `GET /api/code/round-state`
Authoritative round 2 status, timer start timestamp, remaining duration, and scoring configuration.
