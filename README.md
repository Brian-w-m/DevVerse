# DevVerse

Full-stack application with Docker Compose development and AWS SAM Lambda deployment.

## Architecture

```
backend/
├── hello-world/
│   ├── main.go              # Lambda handler (your business logic)
│   ├── Dockerfile           # Lambda container build
│   └── go.mod               # Lambda dependencies
├── template.yaml             # SAM configuration
└── Dockerfile               # SAM CLI runtime (if needed)

docker-compose.yaml           # Orchestrates: frontend, dynamodb, dynamodb-init
```

## DynamoDB Mocking

### Automatic Table Creation

The `dynamodb-init` service automatically creates tables when you start the services.

**Current Setup:**
- Table: `Users`
- Primary Key: `ID` (String, HASH)
- Capacity: 5 read/write units
- Storage: In-memory only (data lost on restart)

**How it works:**
1. `dynamodb` service starts with health check
2. `dynamodb-init` waits for DynamoDB to be healthy
3. Table creation runs automatically (idempotent - safe to run multiple times)

### Using DynamoDB

**Start services:**
```bash
docker-compose up
```

**Verify table exists:**
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-southeast-2
```

**Add custom tables:**

Edit `docker-compose.yaml` in the `dynamodb-init` service's `command` section. Add additional table creation commands:

```yaml
command: >
  -c "
  echo 'Waiting for DynamoDB to be ready...';
  sleep 2;
  # Users table
  aws dynamodb create-table --table-name Users --attribute-definitions AttributeName=ID,AttributeType=S --key-schema AttributeName=ID,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --endpoint-url http://dynamodb:8000 --region ap-southeast-2 || true;
  # Add more tables here
  aws dynamodb create-table --table-name Products --attribute-definitions AttributeName=SKU,AttributeType=S --key-schema AttributeName=SKU,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --endpoint-url http://dynamodb:8000 --region ap-southeast-2 || true;
  echo 'DynamoDB tables initialized!';
  "
```

### Configuration

**Endpoint:** `http://localhost:8000`  
**Region:** `ap-southeast-2`  
**Access Key:** Any dummy value (e.g., `test`)  
**Secret Key:** Any dummy value (e.g., `test`)

**Important:** Tables are created in-memory (`-inMemory` flag). Data is lost when the container stops.

For persistent storage, change the `dynamodb` service command to:
```yaml
command: "-jar DynamoDBLocal.jar -sharedDb -dbPath /data"
```

## Quick Start

### 1. Start services

```bash
docker-compose up -d
```

Services:
- **Frontend**: http://localhost:3000
- **DynamoDB**: http://localhost:8000
- **SAM Local**: (if configured)

### 2. Verify DynamoDB

```bash
# List tables
aws dynamodb list-tables --endpoint-url http://localhost:8000 --region ap-southeast-2

# Describe Users table
aws dynamodb describe-table --table-name Users --endpoint-url http://localhost:8000 --region ap-southeast-2
```

## Development

Tables are automatically recreated each time you run `docker-compose up`. This ensures a clean environment for testing.
