---
name: php-cli
description: Guidance for using the correct PHP 8.3 binary in this repository.
---

# PHP 8.3 CLI Execution Rules

Always use the exact path `C:\desarrollo\php\php.exe` when executing PHP commands in this project.

## Requirements

1. **PHP Binary Path**: Always invoke `C:\desarrollo\php\php.exe` (PHP 8.3.33) rather than the generic `php` command.
2. **Reason**: The system PATH resolves `php` to an older PHP 5.5 binary (`C:\desarrollo\labs\php\php55\php.exe`), which causes false syntax and type-hint errors for modern PHP code.
3. **Usage Examples**:
   - Check version: `C:\desarrollo\php\php.exe -v`
   - Lint PHP script: `C:\desarrollo\php\php.exe -l api/cotizar.php`
   - Start development server: `C:\desarrollo\php\php.exe -S localhost:8000`
