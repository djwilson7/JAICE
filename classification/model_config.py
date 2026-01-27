# model configuration
MODEL_NAME = "MoritzLaurer/deberta-v3-large-zeroshot-v2.0"

# classification labels for application stages
CLASSIFICATION_LABELS = {
    "applied": 
    (
       "email confirming that the company received my job application "
        "and may review it later, but does not ask for scheduling or availability "
        "and does not mention offers or rejection"
    ),

    "interview": 
    (
        "email about scheduling, confirming, or following up on a job interview "
        "or phone screen, including messages that request my availability or "
        "contain words like interview, meeting, call, or chat"
    ),

    "offer": 
    (
        "email clearly telling me that I have a job offer or describing the terms "
        "of a job offer, such as salary, compensation, benefits, or an offer letter"
    ),

    "accepted": 
    (
        "welcome email confirming that I accepted the job and will join as a new hire, "
        "usually mentioning my start date or onboarding"
    ),

    "rejected": 
    (
        "email clearly saying the company is not moving forward, "
        "that I was not selected, or that the position is closed. "
        "It may thank me for interviewing, but must clearly indicate rejection."
    ),
}

# batch size for processing emails
BATCH_SIZE = 1

# confidence threshold for classification
CONFIDENCE_THRESHOLD = 0.6