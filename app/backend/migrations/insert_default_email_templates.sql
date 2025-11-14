-- Migration: 15 Templates Email Professionnels Prêts à l'Emploi
-- Date: 2025-11-14
-- Description: Templates email pour cold email, relance, proposition, etc.

-- Ces templates seront créés pour chaque tenant existant et futur

-- Fonction pour insérer les templates pour tous les tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    -- Pour chaque tenant existant
    FOR tenant_record IN SELECT id FROM tenants
    LOOP
        -- 1. PREMIER CONTACT / INTRODUCTION
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '1. Premier Contact - Introduction',
            'Bonjour {{company_name}} - Opportunité de collaboration',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Je me permets de vous contacter car j''ai remarqué que <strong>{{company_name}}</strong> pourrait bénéficier de nos services.</p>
                <p>Nous aidons les entreprises comme la vôtre à <strong>{{value_proposition}}</strong>.</p>
                <p><strong>Seriez-vous disponible pour un échange de 15 minutes cette semaine ?</strong></p>
                <p>Je reste à votre disposition.</p>
                <p>Cordialement,<br>{{sender_name}}<br>{{sender_company}}<br>{{sender_phone}}</p>
            </div>',
            'cold_email',
            true,
            NOW()
        );

        -- 2. COLD EMAIL B2B
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '2. Cold Email B2B - Direct',
            '{{company_name}} : 3 façons d''augmenter vos ventes',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Je vais être direct : nous avons identifié <strong>3 opportunités concrètes</strong> pour {{company_name}} :</p>
                <ul>
                    <li>{{benefit_1}}</li>
                    <li>{{benefit_2}}</li>
                    <li>{{benefit_3}}</li>
                </ul>
                <p><strong>Résultat attendu :</strong> {{expected_result}}</p>
                <p>Intéressé(e) par un échange rapide ?</p>
                <p>Bien à vous,<br>{{sender_name}}</p>
            </div>',
            'cold_email',
            true,
            NOW()
        );

        -- 3. RELANCE APRÈS SILENCE
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '3. Relance - Après Silence',
            'Re: {{previous_subject}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Je me permets de revenir vers vous suite à mon message du {{previous_date}}.</p>
                <p>Je comprends que vous êtes certainement très occupé(e).</p>
                <p><strong>Pour vous simplifier la vie, voici 3 créneaux disponibles :</strong></p>
                <ul>
                    <li>{{slot_1}}</li>
                    <li>{{slot_2}}</li>
                    <li>{{slot_3}}</li>
                </ul>
                <p>Un simple "oui" suffit, je m''occupe du reste !</p>
                <p>Cordialement,<br>{{sender_name}}</p>
            </div>',
            'follow_up',
            true,
            NOW()
        );

        -- 4. PROPOSITION COMMERCIALE
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '4. Proposition Commerciale',
            'Proposition pour {{company_name}} - {{service_name}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px;">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #4f46e5;">Proposition Commerciale</h2>
                    <p>Bonjour {{contact_name}},</p>
                    <p>Suite à notre échange, je suis ravi de vous présenter notre proposition pour <strong>{{company_name}}</strong>.</p>
                    <h3 style="color: #4f46e5;">🎯 Objectifs</h3>
                    <p>{{objectives}}</p>
                    <h3 style="color: #4f46e5;">📦 Ce qui est inclus</h3>
                    <ul>
                        <li>{{service_1}}</li>
                        <li>{{service_2}}</li>
                        <li>{{service_3}}</li>
                    </ul>
                    <h3 style="color: #4f46e5;">💰 Investissement</h3>
                    <p style="font-size: 24px; font-weight: bold; color: #10b981;">{{price}}€</p>
                    <p><a href="{{proposal_link}}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Voir la proposition complète</a></p>
                    <p>Restons en contact,<br>{{sender_name}}</p>
                </div>
            </div>',
            'proposal',
            true,
            NOW()
        );

        -- 5. REMERCIEMENT APRÈS RDV
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '5. Remerciement Après Rendez-vous',
            'Merci pour votre temps {{contact_name}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Un grand merci pour le temps que vous m''avez accordé aujourd''hui.</p>
                <p><strong>Récapitulatif de notre échange :</strong></p>
                <ul>
                    <li>{{point_1}}</li>
                    <li>{{point_2}}</li>
                    <li>{{point_3}}</li>
                </ul>
                <p><strong>Prochaines étapes :</strong></p>
                <ol>
                    <li>{{next_step_1}}</li>
                    <li>{{next_step_2}}</li>
                </ol>
                <p>Je reviens vers vous le {{next_contact_date}}.</p>
                <p>Excellente journée,<br>{{sender_name}}</p>
            </div>',
            'follow_up',
            true,
            NOW()
        );

        -- 6. OFFRE LIMITÉE
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '6. Offre Limitée - Urgence',
            '⏰ Offre exclusive pour {{company_name}} (expire {{deadline}})',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 2px;">
                <div style="background: white; padding: 30px;">
                    <h2 style="color: #667eea; text-align: center;">⚡ OFFRE EXCLUSIVE ⚡</h2>
                    <p>Bonjour {{contact_name}},</p>
                    <p>En tant que partenaire privilégié, vous bénéficiez d''une <strong>offre exceptionnelle</strong> :</p>
                    <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <p style="margin: 0; font-size: 18px;"><strong>{{discount}}% de réduction</strong></p>
                        <p style="margin: 10px 0 0 0;">sur {{offer_description}}</p>
                    </div>
                    <p><strong>⏰ Expire le {{deadline}}</strong></p>
                    <p style="text-align: center;"><a href="{{cta_link}}" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 20px 0;">Profiter de l''offre</a></p>
                    <p style="text-align: center; color: #6b7280; font-size: 12px;">Cette offre est personnelle et non transférable</p>
                </div>
            </div>',
            'promotion',
            true,
            NOW()
        );

        -- 7. NEWSLETTER / CONTENU
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '7. Newsletter Mensuelle',
            '📰 {{month}} : Les actualités de {{sender_company}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
                    <h1>{{newsletter_title}}</h1>
                    <p>{{month}}</p>
                </div>
                <div style="padding: 30px; background: white;">
                    <h2 style="color: #4f46e5;">🎯 À la Une</h2>
                    <p><strong>{{headline}}</strong></p>
                    <p>{{headline_description}}</p>

                    <h2 style="color: #4f46e5; margin-top: 30px;">📚 Article du mois</h2>
                    <p>{{article_title}}</p>
                    <p>{{article_excerpt}}</p>
                    <p><a href="{{article_link}}" style="color: #4f46e5; text-decoration: none;">→ Lire la suite</a></p>

                    <h2 style="color: #4f46e5; margin-top: 30px;">💡 Le saviez-vous ?</h2>
                    <p>{{tip}}</p>

                    <p style="text-align: center; margin-top: 40px;">
                        <a href="{{unsubscribe_link}}" style="color: #9ca3af; font-size: 12px; text-decoration: none;">Se désinscrire</a>
                    </p>
                </div>
            </div>',
            'newsletter',
            true,
            NOW()
        );

        -- 8. DEMANDE DE TÉMOIGNAGE
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '8. Demande de Témoignage',
            'Votre avis compte 🌟',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Cela fait maintenant {{duration}} que nous travaillons ensemble, et j''espère que vous êtes satisfait(e) de notre collaboration.</p>
                <p><strong>Votre avis nous est précieux !</strong></p>
                <p>Pourriez-vous prendre <strong>2 minutes</strong> pour partager votre expérience ?</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{review_link}}" style="background: #fbbf24; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">⭐ Laisser un avis</a>
                </div>
                <p>Un immense merci par avance,<br>{{sender_name}}</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">PS: Les avis positifs nous aident énormément à développer notre activité 🙏</p>
            </div>',
            'testimonial_request',
            true,
            NOW()
        );

        -- 9. RÉACTIVATION CLIENT INACTIF
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '9. Réactivation Client Inactif',
            'On vous a perdu {{contact_name}} ?',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Je remarque que nous n''avons pas eu de nouvelles de <strong>{{company_name}}</strong> depuis {{inactivity_period}}.</p>
                <p>J''espère que tout va bien de votre côté ! 😊</p>
                <p><strong>Nous avons du nouveau :</strong></p>
                <ul>
                    <li>{{new_feature_1}}</li>
                    <li>{{new_feature_2}}</li>
                    <li>{{new_feature_3}}</li>
                </ul>
                <p><strong>Offre spéciale réactivation :</strong> {{reactivation_offer}}</p>
                <p>Envie d''en discuter autour d''un café (virtuel ou réel) ?</p>
                <p>Au plaisir de vous revoir,<br>{{sender_name}}</p>
            </div>',
            'reactivation',
            true,
            NOW()
        );

        -- 10. INVITATION ÉVÉNEMENT
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '10. Invitation Événement',
            '🎉 Vous êtes invité(e) : {{event_name}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center;">
                    <h1 style="margin: 0;">{{event_name}}</h1>
                    <p style="font-size: 18px; margin: 10px 0 0 0;">{{event_date}} à {{event_time}}</p>
                </div>
                <div style="background: white; padding: 30px;">
                    <p>Bonjour {{contact_name}},</p>
                    <p>Nous avons le plaisir de vous inviter à notre événement exclusif :</p>
                    <div style="background: #ede9fe; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p><strong>📍 Lieu :</strong> {{event_location}}</p>
                        <p><strong>🕐 Horaire :</strong> {{event_time}}</p>
                        <p><strong>👥 Public :</strong> {{event_audience}}</p>
                    </div>
                    <p><strong>Au programme :</strong></p>
                    <ul>
                        <li>{{program_1}}</li>
                        <li>{{program_2}}</li>
                        <li>{{program_3}}</li>
                    </ul>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{{registration_link}}" style="background: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Je m''inscris</a>
                    </p>
                    <p style="text-align: center; color: #6b7280; font-size: 12px;">Places limitées</p>
                </div>
            </div>',
            'event_invitation',
            true,
            NOW()
        );

        -- 11. ANNONCE NOUVEAU PRODUIT
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '11. Annonce Nouveau Produit',
            '🚀 Nouveauté : {{product_name}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #1e40af; color: white; padding: 30px; text-align: center;">
                    <h1>🚀 NOUVEAU</h1>
                    <h2 style="margin: 10px 0;">{{product_name}}</h2>
                </div>
                <div style="padding: 30px; background: white;">
                    <p>Bonjour {{contact_name}},</p>
                    <p>Nous sommes ravis de vous présenter notre dernière innovation !</p>
                    <h3 style="color: #1e40af;">{{product_name}}</h3>
                    <p>{{product_description}}</p>
                    <h3 style="color: #1e40af;">✨ Bénéfices clés</h3>
                    <ul>
                        <li>{{benefit_1}}</li>
                        <li>{{benefit_2}}</li>
                        <li>{{benefit_3}}</li>
                    </ul>
                    <div style="background: #dbeafe; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                        <p style="margin: 0 0 10px 0;"><strong>Offre de lancement</strong></p>
                        <p style="font-size: 28px; font-weight: bold; color: #1e40af; margin: 0;">{{launch_price}}€</p>
                        <p style="font-size: 12px; color: #6b7280; margin: 10px 0 0 0;">au lieu de {{regular_price}}€</p>
                    </div>
                    <p style="text-align: center;">
                        <a href="{{product_link}}" style="background: #1e40af; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Découvrir</a>
                    </p>
                </div>
            </div>',
            'product_announcement',
            true,
            NOW()
        );

        -- 12. CONFIRMATION RENDEZ-VOUS
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '12. Confirmation Rendez-vous',
            '✅ Confirmation : RDV avec {{sender_name}} le {{meeting_date}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
                <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px;">✓</div>
                        <h2 style="color: #10b981; margin: 15px 0 0 0;">Rendez-vous Confirmé</h2>
                    </div>
                    <p>Bonjour {{contact_name}},</p>
                    <p>Votre rendez-vous avec <strong>{{sender_name}}</strong> est confirmé :</p>
                    <div style="background: #eff6ff; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>📅 Date :</strong> {{meeting_date}}</p>
                        <p style="margin: 0 0 10px 0;"><strong>🕐 Heure :</strong> {{meeting_time}}</p>
                        <p style="margin: 0 0 10px 0;"><strong>⏱️ Durée :</strong> {{meeting_duration}}</p>
                        <p style="margin: 0;"><strong>📍 Lieu :</strong> {{meeting_location}}</p>
                    </div>
                    <p><strong>Ordre du jour :</strong></p>
                    <ul>
                        <li>{{agenda_1}}</li>
                        <li>{{agenda_2}}</li>
                    </ul>
                    <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px;">💡 <strong>Préparation :</strong> {{preparation_note}}</p>
                    </div>
                    <p style="text-align: center; margin-top: 30px;">
                        <a href="{{calendar_link}}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">📅 Ajouter au calendrier</a>
                        <a href="{{cancel_link}}" style="color: #ef4444; text-decoration: none; display: inline-block; padding: 12px 30px;">Annuler</a>
                    </p>
                    <p>À très bientôt,<br>{{sender_name}}<br>{{sender_phone}}</p>
                </div>
            </div>',
            'meeting_confirmation',
            true,
            NOW()
        );

        -- 13. SUIVI APRÈS DEVIS
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '13. Suivi Après Devis',
            'Suite à notre devis pour {{company_name}}',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Bonjour {{contact_name}},</p>
                <p>Je reviens vers vous concernant le devis envoyé le {{quote_date}} pour <strong>{{project_name}}</strong>.</p>
                <p>Avez-vous eu l''occasion de le consulter ?</p>
                <p><strong>Récapitulatif :</strong></p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;">📋 Projet : {{project_name}}</p>
                    <p style="margin: 0 0 10px 0;">💰 Montant : {{quote_amount}}€</p>
                    <p style="margin: 0;">⏱️ Délai : {{delivery_time}}</p>
                </div>
                <p><strong>Des questions ?</strong> Je suis à votre disposition pour :</p>
                <ul>
                    <li>Clarifier certains points</li>
                    <li>Ajuster la proposition</li>
                    <li>Discuter d''un échéancier</li>
                </ul>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{{quote_link}}" style="background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Revoir le devis</a>
                </p>
                <p>Dans l''attente de votre retour,<br>{{sender_name}}</p>
            </div>',
            'quote_follow_up',
            true,
            NOW()
        );

        -- 14. ONBOARDING NOUVEAU CLIENT
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '14. Onboarding Nouveau Client',
            '🎉 Bienvenue chez {{sender_company}} !',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
                <div style="background: white; padding: 30px; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #4f46e5;">🎉 Bienvenue !</h1>
                        <p style="font-size: 18px; color: #6b7280;">Nous sommes ravis de vous compter parmi nos clients</p>
                    </div>
                    <p>Bonjour {{contact_name}},</p>
                    <p>Merci pour votre confiance ! Voici les <strong>prochaines étapes</strong> pour bien démarrer :</p>

                    <div style="margin: 30px 0;">
                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                            <div style="background: #4f46e5; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 15px; font-weight: bold;">1</div>
                            <div>
                                <h3 style="margin: 0 0 5px 0; color: #111827;">{{step_1_title}}</h3>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">{{step_1_description}}</p>
                            </div>
                        </div>

                        <div style="display: flex; align-items: start; margin-bottom: 20px;">
                            <div style="background: #4f46e5; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 15px; font-weight: bold;">2</div>
                            <div>
                                <h3 style="margin: 0 0 5px 0; color: #111827;">{{step_2_title}}</h3>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">{{step_2_description}}</p>
                            </div>
                        </div>

                        <div style="display: flex; align-items: start;">
                            <div style="background: #4f46e5; color: white; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 15px; font-weight: bold;">3</div>
                            <div>
                                <h3 style="margin: 0 0 5px 0; color: #111827;">{{step_3_title}}</h3>
                                <p style="margin: 0; color: #6b7280; font-size: 14px;">{{step_3_description}}</p>
                            </div>
                        </div>
                    </div>

                    <div style="background: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0; font-weight: bold;">📞 Votre contact dédié :</p>
                        <p style="margin: 0;">{{account_manager_name}}<br>{{account_manager_phone}}<br>{{account_manager_email}}</p>
                    </div>

                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{{getting_started_link}}" style="background: #4f46e5; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Commencer</a>
                    </p>

                    <p>Excellente collaboration à venir !<br>L''équipe {{sender_company}}</p>
                </div>
            </div>',
            'onboarding',
            true,
            NOW()
        );

        -- 15. ANNIVERSAIRE / FIDÉLISATION
        INSERT INTO email_templates (tenant_id, name, subject, html_body, template_type, is_active, created_at)
        VALUES (
            tenant_record.id,
            '15. Anniversaire Client - Fidélisation',
            '🎂 {{years}} an(s) ensemble - Merci {{contact_name}} !',
            '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 2px;">
                <div style="background: white; padding: 40px; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">🎂</div>
                    <h1 style="color: #f59e0b; margin: 0 0 10px 0;">Joyeux Anniversaire !</h1>
                    <p style="font-size: 24px; color: #6b7280; margin: 0 0 30px 0;">{{years}} an(s) de collaboration</p>

                    <p>Bonjour {{contact_name}},</p>
                    <p>C''est avec une immense gratitude que nous célébrons aujourd''hui <strong>{{years}} année(s)</strong> de partenariat avec <strong>{{company_name}}</strong>.</p>

                    <div style="background: #fef3c7; padding: 30px; border-radius: 10px; margin: 30px 0;">
                        <h2 style="color: #f59e0b; margin: 0 0 20px 0;">🎁 Cadeau Anniversaire</h2>
                        <p style="font-size: 18px; margin: 0;"><strong>{{gift_description}}</strong></p>
                        <p style="margin: 10px 0 0 0;">Code : <strong style="background: white; padding: 5px 15px; border-radius: 5px; font-size: 20px;">{{promo_code}}</strong></p>
                    </div>

                    <p>Ensemble, nous avons :</p>
                    <div style="text-align: left; max-width: 400px; margin: 20px auto;">
                        <p>✅ {{achievement_1}}</p>
                        <p>✅ {{achievement_2}}</p>
                        <p>✅ {{achievement_3}}</p>
                    </div>

                    <p><strong>Merci pour votre fidélité !</strong></p>

                    <p style="margin-top: 40px;">Avec toute notre reconnaissance,<br>L''équipe {{sender_company}}</p>
                </div>
            </div>',
            'anniversary',
            true,
            NOW()
        );

    END LOOP;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ 15 templates email professionnels créés pour tous les tenants';
END $$;
