package vn.edu.vnu.status.dto;

public class CheckResultDto {
    private int httpCode;
    private float responseTimeMs;
    private boolean success;
    private String errorMessage;
    private String errorType;
    private String content;
    private int attempts;

    public int getHttpCode() { return httpCode; }
    public void setHttpCode(int httpCode) { this.httpCode = httpCode; }
    public float getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(float responseTimeMs) { this.responseTimeMs = responseTimeMs; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public String getErrorType() { return errorType; }
    public void setErrorType(String errorType) { this.errorType = errorType; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
}
