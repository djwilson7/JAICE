import logging
from colorlog import ColoredFormatter


def get_logger(name="logger", level=logging.DEBUG):
    # Create and configure logger from name
    logger = logging.getLogger(name)

    # Avoid adding multiple handlers if the logger is already configured
    if not logger.handlers:
        formatter = ColoredFormatter(
            "{log_color}[{asctime:8}] {levelname:8} {filename:<20.20s} {funcName:<20.20s}   line {lineno:4d}\n-----{message}",
            datefmt="%H:%M:%S",
            style="{",
            log_colors={
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "red, bg_white",
            },
        )
        # Create console handler and set level to debug
        handler = logging.StreamHandler()
        # Set the logging level (could be parameterized)
        handler.setFormatter(formatter)
        # Add the handler to the logger
        logger.addHandler(handler)
    # Set the default logging level (allows us to override if needed in specific files)
    logger.setLevel(level)
    
    # Prevent log messages from being propagated to the root logger
    logger.propagate = False
    return logger
