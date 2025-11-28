// Discord Bridge - Response Mapper
// Extracts AI response from Execute Workflow output

return {
  json: {
    reply: $input.first().json.output
  }
};
