import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default admin user
    const adminEmail = 'admin@ramar.com';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existing) {
        const senhaHash = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                nome: 'Administrador',
                email: adminEmail,
                senha: senhaHash,
                perfil: 'SUPER_ADMIN',
                ativo: true,
            },
        });
        console.log('✅ Admin user created: admin@ramar.com / admin123');
    } else {
        console.log('ℹ️  Admin user already exists');
    }

    console.log('✅ Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
