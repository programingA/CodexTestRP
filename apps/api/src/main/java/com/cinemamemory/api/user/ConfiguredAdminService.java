package com.cinemamemory.api.user;

import com.cinemamemory.api.config.AppProperties;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ConfiguredAdminService {
    private final Set<String> adminEmails;

    public ConfiguredAdminService(AppProperties properties) {
        List<String> configuredEmails = properties.adminEmails() == null ? List.of() : properties.adminEmails();
        this.adminEmails = configuredEmails.stream()
                .map(ConfiguredAdminService::normalizeEmail)
                .filter(email -> !email.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    public UserRole roleFor(String email) {
        return isConfiguredAdmin(email) ? UserRole.ADMIN : UserRole.USER;
    }

    public void applyConfiguredAdminRole(User user) {
        if (isConfiguredAdmin(user.getEmail()) && user.getRole() != UserRole.ADMIN) {
            user.updateRole(UserRole.ADMIN);
        }
    }

    private boolean isConfiguredAdmin(String email) {
        return adminEmails.contains(normalizeEmail(email));
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
