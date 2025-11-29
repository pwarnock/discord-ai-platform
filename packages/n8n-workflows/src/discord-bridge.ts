import { App, Chain, Workflow } from "@vahor/n8n-kit";
import { Code, ExecuteWorkflow, RespondToWebhook, Webhook } from "@vahor/n8n-kit/nodes/generated";

const app = new App();

// Workflow
new Workflow(app, "my-workflow", {
    name: "Discord bridge",
    active: true,
    tags: [],
    settings: {
        "executionOrder": "v1",
    },
    definition: [


        Chain.start(new Webhook("ad4fde52-ceca-4ae1-9f42-8d3c4a7d2570", {
            label: "Webhook",
            position: [0,0],
            parameters:  {
                "httpMethod": "POST",
                "path": "discord",
                "responseMode": "responseNode",
                "options": {

                },
            },
        })
        )
        .next(

            Chain.start(new Code("c6454e78-78be-48b8-921e-88711ba62e3f", {
                label: "Prepare Session Context",
                position: [192,0],
                parameters:  {
                    "mode": "runOnceForEachItem",
                    "jsCode": `const isDM = !\$json.body.guild.id;
const authorId = \$json.body.author.id;
const sessionId = isDM 
  ? \`discord-dm-\${authorId}\`
  : \`discord-server-\${authorId}\`;

return {
  json: {
    sessionId: sessionId,
    chatInput: \$json.body.content,
    action: "sendMessage",
    ...(\$json)
  }
};`,
                },
            })
            )
            .next(

                Chain.start(new ExecuteWorkflow("f88455d3-6796-4f50-8d3c-de4f14487da5", {
                    label: "Call 'chat workflow'",
                    position: [400,0],
                    parameters:  {
                        "workflowId": {

                            "__rl": true,
                            "value": "ibk7jqFnR2rUnk0u",
                            "mode": "list",
                            "cachedResultUrl": "/workflow/ibk7jqFnR2rUnk0u",
                            "cachedResultName": "chat workflow",
                        },
                        "workflowInputs": {

                            "mappingMode": "defineBelow",
                            "value": {

                            },
                            "matchingColumns": [

                            ],
                            "schema": [

                            ],
                            "attemptToConvertTypes": false,
                            "convertFieldsToString": true,
                        },
                        "options": {

                            "waitForSubWorkflow": true,
                        },
                    },
                })
                )
                .next(

                    Chain.start(new Code("b5db2600-09c2-45fc-8fa9-5e86cdc9eea6", {
                        label: "Code in JavaScript",
                        position: [624,0],
                        parameters:  {
                            "jsCode": `return {
  json: {
    reply: \$input.first().json.output
  }
};`,
                        },
                    })
                    )
                    .next(

                        new RespondToWebhook("e9357c86-ac5b-4c1f-b5da-db0654457af5", {
                            label: "Respond to Webhook",
                            position: [848,0],
                            parameters:  {
                                "respondWith": "json",
                                "responseBody": "={{ $json }}",
                                "options": {

                                },
                            },
                        })
                        ,
                    ),
                ),
            ),
        ),
    ],
});

export { app };
