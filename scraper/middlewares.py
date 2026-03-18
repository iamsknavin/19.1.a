"""Custom Scrapy middlewares for 19.1.a."""
import random
from scrapy import signals


class RotateUserAgentMiddleware:
    """Rotate user agent on every request."""

    def __init__(self, user_agents: list[str]):
        self.user_agents = user_agents

    @classmethod
    def from_crawler(cls, crawler):
        user_agents = crawler.settings.getlist(
            "USER_AGENT_LIST",
            ["Mozilla/5.0 (compatible; 19-1-a-Bot/1.0)"],
        )
        return cls(user_agents)

    def process_request(self, request, spider):
        request.headers["User-Agent"] = random.choice(self.user_agents)
