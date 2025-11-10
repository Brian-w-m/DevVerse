package database

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
)

func NewDynamoDBClient(cfg appconfig.Config) (*dynamodb.Client, error) {
	ctx := context.Background()

	var configOptions []func(*config.LoadOptions) error
	configOptions = append(configOptions, config.WithRegion(cfg.AWSRegion))

	// Set custom endpoint if provided (for local development)
	if cfg.DynamoDBEndpoint != "" {
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			if service == dynamodb.ServiceID {
				return aws.Endpoint{
					URL:           cfg.DynamoDBEndpoint,
					SigningRegion: cfg.AWSRegion,
				}, nil
			}
			// Let SDK fall back to its default resolver for other services
			return aws.Endpoint{}, &aws.EndpointNotFoundError{}
		})
		configOptions = append(configOptions, config.WithEndpointResolverWithOptions(customResolver))
	}

	awsCfg, err := config.LoadDefaultConfig(ctx, configOptions...)
	if err != nil {
		return nil, err
	}

	client := dynamodb.NewFromConfig(awsCfg)
	return client, nil
}