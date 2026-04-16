package appconfig

const (
	DefaultLogLevel      = "info"
	DefaultPort          = 8080
	DefaultAWSRegion     = "ap-southeast-2"
	DefaultDynamoDBTable = "Users"

	// TODO 1.5 #2: Add table name constants for the two new DynamoDB tables and expose
	// them as environment-variable-backed fields on Config (like DynamoDBTable is today).
	// Also add the CREATE TABLE commands for Sessions and DailyActivity to the Docker
	// Compose init script and to the manual setup instructions in README.md.

	DefaultSessionsTable      = "Sessions"       // PK: UserID, SK: SessionID
	DefaultDailyActivityTable = "DailyActivity"  // PK: UserID, SK: Date (YYYY-MM-DD)
)

