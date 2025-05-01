# E-commerce Security Simulation Platform

This project is a deliberately vulnerable e-commerce application built for security training, red team/blue team exercises, and educational purposes. It contains intentional security flaws including SQL injection vulnerabilities to help security professionals and developers understand, identify, and remediate common web application security issues.

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or yarn

### Setup and Run

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd e-commerce
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the database using Docker Compose**
   ```bash
   docker-compose up -d
   ```
   This will start a MySQL database container with all necessary tables and sample data.

4. **Start the application**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs