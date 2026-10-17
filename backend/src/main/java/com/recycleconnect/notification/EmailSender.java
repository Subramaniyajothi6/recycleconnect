package com.recycleconnect.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.recycleconnect.config.AppProperties;

/**
 * Sends plain-text email through any SMTP server (for example a free Brevo or Gmail SMTP account).
 * With no MAIL_HOST set it only logs, so the app works without any email service (DECISIONS P7).
 * Runs in the background so a slow mail server never delays the user.
 */
@Component
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final AppProperties.Mail mail;
    private final ObjectProvider<JavaMailSender> sender;

    public EmailSender(AppProperties props, ObjectProvider<JavaMailSender> sender) {
        this.mail = props.mail();
        this.sender = sender;
    }

    public boolean isConfigured() {
        return mail != null && mail.host() != null && !mail.host().isBlank() && sender.getIfAvailable() != null;
    }

    @Async
    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank()) return;
        if (!isConfigured()) {
            log.info("Email not sent (no MAIL_HOST): subject={}", subject);
            return;
        }
        SimpleMailMessage m = new SimpleMailMessage();
        m.setFrom(mail.from());
        m.setTo(to);
        m.setSubject(subject);
        m.setText(body + "\n\nRecycleConnect");
        try {
            sender.getObject().send(m);
        } catch (MailException e) {
            log.warn("Email failed: {}", e.getMessage());
        }
    }
}
